/**
 * POST /api/jobs/process
 * Process embedding jobs from queue (called by Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbeddingsBatched,
  getEmbeddingModel,
} from "@/lib/embeddings/openrouter";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

interface EmbeddingJob {
  id: string;
  paper_id: string;
  retry_count: number;
  max_retries: number;
}

interface ChunkRecord {
  id: string;
  content: string;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");

  // Vérifier le secret Cron (à définir dans Vercel)
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const startTime = Date.now();
  let processedJobs = 0;
  let failedJobs = 0;

  try {
    // Get next pending job (up to 5 at once)
    const { data: jobs, error: jobsError } = await supabase
      .from("embedding_jobs")
      .select("id, paper_id, retry_count, max_retries")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(5);

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log("[QUEUE] No pending jobs");
      return NextResponse.json({
        processed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        message: "No jobs to process"
      });
    }

    console.log(`[QUEUE] Processing ${jobs.length} jobs`);

    for (const job of jobs as EmbeddingJob[]) {
      const jobStartTime = Date.now();
      try {
        // Mark as processing
        await supabase
          .from("embedding_jobs")
          .update({
            status: "processing",
            started_at: new Date().toISOString()
          })
          .eq("id", job.id);

        // Process embeddings for this paper
        const result = await processPaperEmbeddings(job.paper_id);

        // Mark as complete
        await supabase
          .from("embedding_jobs")
          .update({
            status: "complete",
            completed_at: new Date().toISOString()
          })
          .eq("id", job.id);

        processedJobs++;
        const jobDuration = Date.now() - jobStartTime;
        console.log(`[QUEUE] Job ${job.id} completed in ${jobDuration}ms: ${result}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[QUEUE] Job ${job.id} failed:`, errorMsg);

        // Check if we should retry
        if (job.retry_count < job.max_retries) {
          await supabase
            .from("embedding_jobs")
            .update({
              status: "pending",
              retry_count: job.retry_count + 1,
              error_message: errorMsg
            })
            .eq("id", job.id);

          console.log(`[QUEUE] Job ${job.id} will retry (${job.retry_count + 1}/${job.max_retries})`);
        } else {
          // Max retries exceeded
          await supabase
            .from("embedding_jobs")
            .update({
              status: "error",
              error_message: errorMsg,
              completed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          failedJobs++;
          console.error(`[QUEUE] Job ${job.id} marked as error after ${job.max_retries} retries`);
        }
      }
    }

    return NextResponse.json({
      processed: processedJobs,
      failed: failedJobs,
      duration: Date.now() - startTime,
      message: `Processed ${jobs.length} jobs`
    });

  } catch (error) {
    console.error("Queue processing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Processing failed",
        processed: processedJobs,
        failed: failedJobs,
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Process embeddings for a single paper
 */
async function processPaperEmbeddings(paperId: string) {
  const supabase = await createClient();

  // Update paper status
  await supabase
    .from("papers")
    .update({ embedding_status: "processing" })
    .eq("id", paperId);

  // Get chunks without embeddings
  const { data: chunks, error: chunksError } = await supabase
    .from("chunks")
    .select("id, content")
    .eq("paper_id", paperId)
    .is("embedding", null);

  if (chunksError) {
    throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
  }

  if (!chunks || chunks.length === 0) {
    // No chunks to process
    await supabase
      .from("papers")
      .update({ embedding_status: "complete" })
      .eq("id", paperId);

    return { status: "complete", processed: 0 };
  }

  const texts = (chunks as ChunkRecord[]).map(c => c.content);
  const chunkIds = (chunks as ChunkRecord[]).map(c => c.id);

  // Generate embeddings
  const { embeddings, totalTokens, failedIndices } =
    await generateEmbeddingsBatched(texts);

  // Update chunks
  let processed = 0;
  let failed = failedIndices.length;
  const model = getEmbeddingModel();
  const now = new Date().toISOString();

  for (let i = 0; i < chunkIds.length; i++) {
    if (failedIndices.includes(i)) continue;

    const embedding = embeddings[i];
    if (!embedding) {
      failed++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("chunks")
      .update({
        embedding: embedding,
        embedding_model: model,
        embedded_at: now
      })
      .eq("id", chunkIds[i]);

    if (updateError) {
      console.error(`Failed to update chunk ${chunkIds[i]}:`, updateError);
      failed++;
    } else {
      processed++;
    }
  }

  // Determine final status
  const finalStatus = failed === 0 ? "complete" :
                     failed === chunks.length ? "error" : "partial";

  // Update paper status
  await supabase
    .from("papers")
    .update({ embedding_status: finalStatus })
    .eq("id", paperId);

  return {
    status: finalStatus,
    processed,
    failed,
    totalChunks: chunks.length,
    totalTokens
  };
}
