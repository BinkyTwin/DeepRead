/**
 * GET /api/jobs/stats
 * Get queue statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get job counts by status
    const { data: statusCounts } = await supabase
      .from("embedding_jobs")
      .select("status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

    const stats = {
      pending: 0,
      processing: 0,
      complete: 0,
      error: 0,
      total: statusCounts?.length || 0
    };

    statusCounts?.forEach(job => {
      const status = job.status as keyof typeof stats;
      if (stats[status] !== undefined) {
        stats[status]++;
      }
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
