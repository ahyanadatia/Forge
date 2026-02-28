import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/scoring/v3/history?limit=10
 * Returns score history for the authenticated builder.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    50,
    parseInt(request.nextUrl.searchParams.get("limit") ?? "10")
  );

  const { data, error } = await (supabase as any)
    .from("score_history")
    .select("id, score_v3, previous_score, delta, breakdown, anomaly_flags, model_version, reason, computed_at")
    .eq("builder_id", user.id)
    .order("computed_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}
