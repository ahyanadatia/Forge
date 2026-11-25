import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_NOT_CONFIGURED, createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/scoring/pipeline";
import { enqueueRecompute } from "@/lib/scoring/evidence";

/**
 * POST /api/scoring/v3/compute
 * Queues a recompute of the caller's own score. Rate-limited to once every
 * 15 minutes. The queue is system-managed, so the job is written with the
 * service-role client after the caller is authenticated.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json(ADMIN_NOT_CONFIGURED, { status: 503 });

  if (!(await checkRateLimit(admin, user.id))) {
    return NextResponse.json(
      { error: "Rate limited. Score can be recomputed once every 15 minutes." },
      { status: 429 }
    );
  }

  try {
    await enqueueRecompute(admin, user.id, "manual");
    return NextResponse.json({ success: true, message: "Score recompute queued." });
  } catch (err) {
    console.error("compute: enqueue failed", err);
    return NextResponse.json({ error: "Failed to enqueue recompute" }, { status: 500 });
  }
}
