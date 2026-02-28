import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/scoring/pipeline";
import { enqueueRecompute } from "@/lib/scoring/evidence";

/**
 * POST /api/scoring/v3/compute
 * Auth-gated, rate-limited. Only own builder_id.
 * Enqueues a recompute job rather than computing inline.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const builderId = user.id;

  // Rate limit check
  const allowed = await checkRateLimit(supabase as any, builderId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limited. Score can be recomputed once every 15 minutes." },
      { status: 429 }
    );
  }

  try {
    await enqueueRecompute(supabase as any, builderId, "manual");

    return NextResponse.json({
      success: true,
      message: "Score recompute queued. Check back in a moment.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to enqueue recompute" },
      { status: 500 }
    );
  }
}
