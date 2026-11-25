import type { SupabaseClient } from "@supabase/supabase-js";
import { toHistorySeries, toV3View, type V3DimensionKey, type V3HistoryPoint, type V3ScoreView } from "@/lib/score/v3-view";

// The generated types don't describe the RPC yet; keep the loosening local.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export interface V3ScoreData {
  view: V3ScoreView | null;
  history: V3HistoryPoint[];
}

async function activeWeights(client: Client): Promise<Partial<Record<V3DimensionKey, number>> | undefined> {
  const { data } = await client
    .from("scoring_model_versions")
    .select("weights")
    .is("deprecated_at", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  const w = (data?.weights ?? null) as Record<string, unknown> | null;
  if (!w) return undefined;
  const pick = (k: string) => (typeof w[k] === "number" ? (w[k] as number) : undefined);
  return { ec: pick("ec_weight"), rc: pick("rc_weight"), aoi: pick("aoi_weight"), lpi: pick("lpi_weight") };
}

/**
 * Loads the V3 score for a profile. Owners get the full latest history row
 * (including integrity flags) and a trend; everyone else gets the public
 * summary from `get_public_score_v3`. Any failure degrades to "no score".
 */
export async function getV3Score(client: Client, builderId: string, isOwner: boolean): Promise<V3ScoreData> {
  try {
    const weights = await activeWeights(client).catch(() => undefined);

    if (isOwner) {
      const { data, error } = await client
        .from("score_history")
        .select("score_v3, delta, breakdown, anomaly_flags, model_version, computed_at")
        .eq("builder_id", builderId)
        .order("computed_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return { view: toV3View(data?.[0], weights), history: toHistorySeries(data) };
    }

    const { data, error } = await client.rpc("get_public_score_v3", { p_builder_id: builderId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { view: null, history: [] };
    return {
      view: toV3View(
        {
          score_v3: row.score_v3,
          breakdown: { dimensions: row.dimensions, confidence: row.confidence },
          model_version: row.model_version,
          computed_at: row.computed_at,
        },
        weights
      ),
      history: [],
    };
  } catch (err) {
    console.error("getV3Score failed", err);
    return { view: null, history: [] };
  }
}
