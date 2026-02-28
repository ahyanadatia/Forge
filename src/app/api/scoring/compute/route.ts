import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gatherScoreInputs } from "@/services/score-data";
import { computeForgeScoreV2 } from "@/lib/forge-score";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let targetId = user.id;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.builder_id) targetId = body.builder_id;
  } catch {
    // Use current user
  }

  try {
    const inputs = await gatherScoreInputs(supabase, targetId);
    const result = computeForgeScoreV2(inputs);

    // Store on the builders row (bypasses trigger via server context)
    const { error: updateErr } = await (supabase as any)
      .from("builders")
      .update({
        forge_score: result.forge_score,
        confidence_score: result.confidence_score,
        delivery_success_score: result.delivery_success_score,
        reliability_score: result.reliability_score,
        delivery_quality_score: result.delivery_quality_score,
        consistency_score: result.consistency_score,
        last_scored_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (updateErr) {
      console.error("Failed to store score:", updateErr);
    }

    // Also update the legacy forge_scores table for backward compatibility
    const { data: existing } = await (supabase as any)
      .from("forge_scores")
      .select("id")
      .eq("builder_id", targetId)
      .single();

    const legacyRow = {
      score: result.forge_score,
      verified_deliveries_component: result.delivery_success_score,
      reliability_component: result.reliability_score,
      collaboration_component: result.delivery_quality_score,
      consistency_component: result.consistency_score,
      confidence: result.confidence_score,
      effective_score: result.forge_score,
      computed_at: new Date().toISOString(),
    };

    if (existing) {
      await (supabase as any)
        .from("forge_scores")
        .update(legacyRow)
        .eq("builder_id", targetId);
    } else {
      await (supabase as any)
        .from("forge_scores")
        .insert({ builder_id: targetId, ...legacyRow });
    }

    return NextResponse.json({ success: true, score: result });
  } catch (error: any) {
    console.error("Score computation failed:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to compute score" },
      { status: 500 }
    );
  }
}
