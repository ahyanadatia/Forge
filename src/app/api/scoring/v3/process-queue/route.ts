import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processRecomputeJob } from "@/lib/scoring/pipeline";

/**
 * POST /api/scoring/v3/process-queue
 * Processes pending recompute jobs. Called by cron or internal trigger.
 * Processes up to 10 jobs per invocation.
 */
export async function POST() {
  const supabase = await createClient();

  const { data: jobs } = await (supabase as any)
    .from("score_recompute_queue")
    .select("id, builder_id")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await processRecomputeJob(supabase as any, job.id);
    if (result) {
      processed++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, total: jobs.length });
}
