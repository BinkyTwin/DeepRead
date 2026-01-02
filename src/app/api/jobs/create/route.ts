/**
 * POST /api/jobs/create
 * Add a job to embedding queue
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paperId = body.paperId;
    const priority = body.priority ?? 0;

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from("embedding_jobs")
      .select("id, status")
      .eq("paper_id", paperId)
      .in("status", ["pending", "processing"])
      .single();

    if (existingJob) {
      console.log(`[QUEUE] Job already exists for paper ${paperId}: ${existingJob.id}`);
      return NextResponse.json({
        jobId: existingJob.id,
        message: "Job already in queue",
        status: existingJob.status
      });
    }

    // Create new job
    const { data: job, error } = await supabase
      .from("embedding_jobs")
      .insert({
        paper_id: paperId,
        priority,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    console.log(`[QUEUE] Created embedding job ${job.id} for paper ${paperId}`);

    return NextResponse.json({
      jobId: job.id,
      message: "Job added to queue"
    });
  } catch (error) {
    console.error("Queue create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create job" },
      { status: 500 }
    );
  }
}
