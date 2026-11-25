import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_NOT_CONFIGURED, createAdminClient } from "@/lib/supabase/admin";
import { processRecomputeJob } from "@/lib/scoring/pipeline";

/**
 * POST /api/scoring/v3/process-queue
 * Processes up to 10 pending recompute jobs.
 *
 * - A scheduler presenting `Authorization: Bearer $CRON_SECRET` processes
 *   jobs for everyone.
 * - A signed-in user can only process their own pending jobs, so one user
 *   cannot spend compute on (or observe) other users' recomputes.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const viaScheduler = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;

  let onlyBuilderId: string | null = null;
  if (!viaScheduler) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    onlyBuilderId = user.id;
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json(ADMIN_NOT_CONFIGURED, { status: 503 });

  let query = admin
    .from("score_recompute_queue")
    .select("id, builder_id")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  if (onlyBuilderId) query = query.eq("builder_id", onlyBuilderId);

  const { data: jobs, error } = await query;
  if (error) {
    console.error("process-queue: could not read queue", error);
    return NextResponse.json({ error: "Could not read queue" }, { status: 500 });
  }
  if (!jobs || jobs.length === 0) return NextResponse.json({ processed: 0 });

  let processed = 0;
  let failed = 0;
  for (const job of jobs) {
    if (await processRecomputeJob(admin, job.id)) processed++;
    else failed++;
  }

  return NextResponse.json({ processed, failed, total: jobs.length });
}
