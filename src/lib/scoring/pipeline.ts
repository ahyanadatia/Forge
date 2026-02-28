/**
 * Score V3 Recompute Pipeline
 *
 * Processes the score_recompute_queue. Each job:
 * 1. Gathers all evidence for builder
 * 2. Loads current model version
 * 3. Computes V3 score
 * 4. Writes score_history
 * 5. Updates builders.score_v3
 * 6. Marks queue item complete
 */

import { computeForgeScoreV3, type ComputeV3Input } from "./engine";
import { getBuilderEvidence, countEvidenceByType } from "./evidence";
import type { ScoringModelVersion, ScoreEvidence, V3ScoreResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export async function processRecomputeJob(
  client: Client,
  jobId: string
): Promise<V3ScoreResult | null> {
  // Claim the job
  const { data: job, error: claimErr } = await client
    .from("score_recompute_queue")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "pending")
    .select()
    .single();

  if (claimErr || !job) return null;

  try {
    const result = await computeScoreForBuilder(
      client,
      job.builder_id,
      job.trigger_type,
      job.trigger_type === "delivery_verified" || job.trigger_type === "project_status_change"
    );

    await client
      .from("score_recompute_queue")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", jobId);

    return result;
  } catch (err: any) {
    await client
      .from("score_recompute_queue")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_message: err.message,
      })
      .eq("id", jobId);
    return null;
  }
}

export async function computeScoreForBuilder(
  client: Client,
  builderId: string,
  reason: string,
  hasMilestoneEvidence: boolean = false
): Promise<V3ScoreResult> {
  // Load model version
  const { data: modelRow } = await client
    .from("scoring_model_versions")
    .select("*")
    .is("deprecated_at", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();

  const model: ScoringModelVersion = modelRow
    ? {
        version: modelRow.version,
        weights: modelRow.weights,
        caps: modelRow.caps,
        tier_config: modelRow.tier_config,
        effective_from: modelRow.effective_from,
      }
    : getDefaultModel();

  // Gather all evidence
  const evidence = await getBuilderEvidence(client, builderId);
  const counts = await countEvidenceByType(client, builderId);

  // Get previous score
  const { data: builder } = await client
    .from("builders")
    .select("score_v3, tenure_start, ai_backend, ai_frontend, ai_ml, ai_systems, ai_devops")
    .eq("id", builderId)
    .single();

  const previousScore = builder?.score_v3 ?? null;
  const tenureStart = builder?.tenure_start
    ? new Date(builder.tenure_start).getTime()
    : getFirstEvidenceTime(evidence);
  const tenureDays = Math.max(0, (Date.now() - tenureStart) / (24 * 60 * 60 * 1000));

  const currentSkills = [
    builder?.ai_backend ?? 0,
    builder?.ai_frontend ?? 0,
    builder?.ai_ml ?? 0,
    builder?.ai_systems ?? 0,
    builder?.ai_devops ?? 0,
  ];

  // Get previous score history for skill jump detection
  const { data: lastHistory } = await client
    .from("score_history")
    .select("breakdown")
    .eq("builder_id", builderId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .single();

  const previousSkillScores = lastHistory?.breakdown?.skill_scores ?? null;

  // Get attestations for ring detection
  const { data: attestations } = await client
    .from("score_evidence")
    .select("*")
    .eq("type", "TEAM_ATTESTATION")
    .is("superseded_by", null);

  const computeInput: ComputeV3Input = {
    builderId,
    evidence,
    counts,
    tenureDays,
    previousScore,
    previousSkillScores,
    currentSkillScores: currentSkills,
    allAttestationsForBuilder: (attestations ?? []) as ScoreEvidence[],
    model,
    triggerReason: reason,
    hasMilestoneEvidence,
  };

  const result = computeForgeScoreV3(computeInput);

  // Write score_history
  await client.from("score_history").insert({
    builder_id: builderId,
    score_v3: result.score,
    previous_score: result.previous_score,
    delta: result.delta,
    breakdown: {
      ...result.breakdown,
      skill_scores: currentSkills,
    },
    anomaly_flags: result.anomaly_flags,
    evidence_snapshot_ids: result.evidence_ids.slice(0, 100),
    model_version: model.version,
    reason,
  });

  // Update builders row
  await client
    .from("builders")
    .update({
      score_v3: result.score,
      score_v3_model: model.version,
      score_v3_computed_at: new Date().toISOString(),
      ...(builder?.tenure_start ? {} : { tenure_start: new Date(tenureStart).toISOString() }),
    })
    .eq("id", builderId);

  // Update rate limit
  await client
    .from("score_rate_limits")
    .upsert(
      { builder_id: builderId, last_computed_at: new Date().toISOString() },
      { onConflict: "builder_id" }
    );

  return result;
}

export async function checkRateLimit(
  client: Client,
  builderId: string
): Promise<boolean> {
  const { data } = await client
    .from("score_rate_limits")
    .select("last_computed_at")
    .eq("builder_id", builderId)
    .single();

  if (!data) return true;

  const elapsed = Date.now() - new Date(data.last_computed_at).getTime();
  return elapsed >= RATE_LIMIT_MS;
}

function getFirstEvidenceTime(evidence: ScoreEvidence[]): number {
  if (evidence.length === 0) return Date.now();
  return Math.min(...evidence.map((e) => new Date(e.created_at).getTime()));
}

function getDefaultModel(): ScoringModelVersion {
  return {
    version: "v3.0",
    weights: {
      ec_weight: 0.30,
      aoi_weight: 0.20,
      rc_weight: 0.30,
      lpi_weight: 0.20,
      self_report_max_weight: 0.20,
      self_report_evidence_threshold: 3,
    },
    caps: {
      normal_delta_max: 35,
      milestone_delta_max: 70,
      tier_800_min_months: 4,
      tier_900_min_months: 9,
      inactivity_decay_start_days: 60,
      inactivity_decay_rate_per_day: 0.15,
      bcm_min: 0.60,
      bcm_max: 1.05,
    },
    tier_config: {
      floors: { "100": 0, "200": 15, "400": 30, "600": 50, "800": 70, "900": 85 },
      score_min: 100,
      score_max: 999,
    },
    effective_from: new Date().toISOString(),
  };
}
