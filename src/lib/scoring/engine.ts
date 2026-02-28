/**
 * Forge Score V3 Engine
 *
 * 4-dimension composite (EC, AOI, RC, LPI) × BCM → 100-999 scale.
 * Deterministic given evidence. No self-report in the hot path.
 *
 * Movement caps:
 *   ±35 normal recompute
 *   ±70 with milestone evidence (delivery_verified, project_completed)
 * Tenure gates:
 *   800+ requires ≥4 months evidence
 *   900+ requires ≥9 months evidence
 * Inactivity decay after 60 days.
 */

import type {
  ECInput,
  AOIInput,
  RCInput,
  LPIInput,
  V3DimensionScores,
  V3ScoreBreakdown,
  V3ScoreResult,
  ModelWeights,
  ModelCaps,
  BCMResult,
  ScoreEvidence,
  ScoringModelVersion,
} from "./types";
import { computeBCM } from "./anti-gaming";
import { countEvidenceByType, getBuilderEvidence } from "./evidence";

// ─── Clamping helpers ────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

// ─── Dimension: Execution Consistency (EC) ───────────────────────────────

export function computeEC(input: ECInput): number {
  const deliveryScore = 1 - Math.exp(-
    (1.0 * input.verified_deliveries +
     1.5 * input.sustained_deliveries +
     0.5 * input.team_completed_deliveries) / 8
  );

  const cadence = 1 - Math.exp(-input.deliveries_last_6m / 3);
  const activity = clamp01(input.active_weeks_last_12 / 12);
  const recency = Math.exp(-input.recency_days / 90);
  const evidenceConsistency = clamp01(input.evidence_additions_count / 20);

  const raw =
    0.40 * deliveryScore +
    0.20 * cadence +
    0.15 * activity +
    0.15 * recency +
    0.10 * evidenceConsistency;

  return Math.round(100 * clamp01(raw));
}

// ─── Dimension: AI-Orchestration Intelligence (AOI) ─────────────────────

export function computeAOI(input: AOIInput): number {
  const depth = clamp01(input.stack_depth_score);
  const ownership = clamp01(input.ownership_strong_count / 3);
  const complexity = clamp01(input.repo_complexity_signals / 5);
  const archLogs = clamp01(input.arch_decision_logs / 3);
  const prReview = clamp01(input.pr_review_count / 10);

  const raw =
    0.30 * depth +
    0.25 * ownership +
    0.20 * complexity +
    0.15 * archLogs +
    0.10 * prReview;

  return Math.round(100 * clamp01(raw));
}

// ─── Dimension: Reliability & Commitment (RC) ───────────────────────────

export function computeRC(input: RCInput): number {
  const J = input.projects_joined;
  const Comp = input.projects_completed;

  if (J === 0 && Comp === 0) return 0;

  // Bayesian completion rate
  const pComplete = (Comp + 2) / (J + 3);

  // Penalties: ghosting harshest, no-show very harsh, abandon/late lighter
  const penaltyExponent =
    -(2.5 * input.no_show_count +
      1.8 * input.team_departure_ghost +
      1.2 * input.projects_abandoned +
      0.6 * input.projects_late) / Math.max(1, J);

  const pen = Math.exp(penaltyExponent);

  // Attestation bonus (capped, weighted by attester credibility)
  const attestBonus = clamp01(input.attestation_score) * 0.15;

  // Clean departure credit
  const cleanDepartureRatio = input.team_departure_clean > 0
    ? input.team_departure_clean / (input.team_departure_clean + input.team_departure_ghost + 0.01)
    : 0;
  const departureCredit = cleanDepartureRatio * 0.10;

  const raw = pComplete * pen + attestBonus + departureCredit;
  return Math.round(100 * clamp01(raw));
}

// ─── Dimension: Live Performance Index (LPI) ────────────────────────────

export function computeLPI(input: LPIInput): number {
  const deployRate = input.deployment_probes_total > 0
    ? input.deployment_probes_passed / input.deployment_probes_total
    : 0;

  const ghRate = input.github_contributor_total > 0
    ? input.github_contributor_verified / input.github_contributor_total
    : 0;

  const liveChallenge = clamp01(input.live_challenge_score);

  const raw =
    0.40 * deployRate +
    0.35 * ghRate +
    0.25 * liveChallenge;

  return Math.round(100 * clamp01(raw));
}

// ─── Composite + Non-Linear Mapping ─────────────────────────────────────

export function computeComposite(
  dims: V3DimensionScores,
  weights: ModelWeights
): number {
  return (
    weights.ec_weight * dims.ec +
    weights.aoi_weight * dims.aoi +
    weights.rc_weight * dims.rc +
    weights.lpi_weight * dims.lpi
  );
}

/**
 * Maps 0-100 composite to 100-999 using non-linear compression.
 * Low scores compress upward (floor at 100).
 * High scores compress downward (ceiling at 999).
 * Uses sigmoid-like mapping for natural distribution.
 */
export function mapTo3Digit(composite: number): number {
  const t = clamp(composite / 100, 0, 1);
  // Sigmoid-shaped mapping: steeper in the middle, compressed at extremes
  const mapped = 1 / (1 + Math.exp(-8 * (t - 0.5)));
  return Math.round(100 + mapped * 899);
}

/**
 * Apply tenure gates: certain score tiers require minimum tenure.
 */
export function applyTenureGates(
  score: number,
  tenureMonths: number,
  caps: ModelCaps
): number {
  if (score >= 900 && tenureMonths < caps.tier_900_min_months) {
    return Math.min(score, 899);
  }
  if (score >= 800 && tenureMonths < caps.tier_800_min_months) {
    return Math.min(score, 799);
  }
  return score;
}

/**
 * Apply movement caps: limit how much score can change per recompute.
 */
export function applyMovementCaps(
  newScore: number,
  previousScore: number | null,
  hasMilestoneEvidence: boolean,
  caps: ModelCaps
): { score: number; cappedDelta: number } {
  if (previousScore == null) {
    return { score: newScore, cappedDelta: 0 };
  }

  const maxDelta = hasMilestoneEvidence
    ? caps.milestone_delta_max
    : caps.normal_delta_max;

  const rawDelta = newScore - previousScore;
  const clampedDelta = clamp(rawDelta, -maxDelta, maxDelta);

  return {
    score: previousScore + clampedDelta,
    cappedDelta: clampedDelta,
  };
}

/**
 * Apply inactivity decay if builder has been inactive.
 */
export function applyInactivityDecay(
  score: number,
  recencyDays: number,
  caps: ModelCaps
): { score: number; decayApplied: number } {
  if (recencyDays <= caps.inactivity_decay_start_days) {
    return { score, decayApplied: 0 };
  }

  const inactiveDays = recencyDays - caps.inactivity_decay_start_days;
  const decay = Math.round(inactiveDays * caps.inactivity_decay_rate_per_day);
  const decayed = Math.max(100, score - decay);

  return { score: decayed, decayApplied: score - decayed };
}

// ─── Evidence → Dimension Inputs ────────────────────────────────────────

export function buildDimensionInputs(
  evidence: ScoreEvidence[],
  counts: Record<string, number>,
  tenureDays: number
): { ec: ECInput; aoi: AOIInput; rc: RCInput; lpi: LPIInput } {
  const now = Date.now();
  const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000;
  const TWELVE_MONTHS = 365 * 24 * 60 * 60 * 1000;

  const recentEvidence = evidence.filter(
    (e) => now - new Date(e.created_at).getTime() < SIX_MONTHS
  );

  const weekSet = new Set(
    evidence.map((e) =>
      Math.floor(new Date(e.created_at).getTime() / (7 * 24 * 60 * 60 * 1000))
    ).filter((w) => now - w * 7 * 24 * 60 * 60 * 1000 < TWELVE_MONTHS)
  );

  const lastTs = evidence.length > 0
    ? Math.max(...evidence.map((e) => new Date(e.created_at).getTime()))
    : 0;
  const recencyDays = lastTs > 0 ? (now - lastTs) / (24 * 60 * 60 * 1000) : 365;

  // Stack depth from REPO_STACK_INFERRED evidence
  const stackEvidence = evidence.filter((e) => e.type === "REPO_STACK_INFERRED");
  const allDepthFlags = new Set<string>();
  for (const se of stackEvidence) {
    const p = se.payload as any;
    if (p.has_ci) allDepthFlags.add("ci");
    if (p.has_tests) allDepthFlags.add("tests");
    if (p.has_dockerfile) allDepthFlags.add("docker");
    for (const lang of Object.keys(p.languages ?? {})) {
      allDepthFlags.add(lang.toLowerCase());
    }
  }

  const ec: ECInput = {
    verified_deliveries: counts["DELIVERY_VERIFIED"] ?? 0,
    sustained_deliveries: counts["DELIVERY_SUSTAINED"] ?? 0,
    team_completed_deliveries: counts["PROJECT_COMPLETED"] ?? 0,
    active_weeks_last_12: weekSet.size,
    deliveries_last_6m: recentEvidence.filter((e) => e.type === "DELIVERY_VERIFIED").length,
    recency_days: recencyDays,
    evidence_additions_count: evidence.length,
  };

  const aoi: AOIInput = {
    stack_depth_score: Math.min(1, allDepthFlags.size / 8),
    ownership_strong_count: counts["OWNERSHIP_VERIFIED_STRONG"] ?? 0,
    repo_complexity_signals: stackEvidence.filter(
      (e) => (e.payload as any).has_ci || (e.payload as any).has_tests
    ).length,
    arch_decision_logs: counts["ARCH_DECISION_LOG"] ?? 0,
    pr_review_count: counts["PR_REVIEW_ACTIVITY"] ?? 0,
  };

  const rc: RCInput = {
    projects_joined: (counts["TEAM_JOINED"] ?? 0),
    projects_completed: (counts["PROJECT_COMPLETED"] ?? 0),
    projects_abandoned: (counts["PROJECT_ABANDONED"] ?? 0),
    projects_late: (counts["DELIVERY_DROPPED"] ?? 0),
    no_show_count: counts["NO_SHOW_FLAG"] ?? 0,
    team_departure_clean: (counts["TEAM_DEPARTED"] ?? 0),
    team_departure_ghost: (counts["NO_SHOW_FLAG"] ?? 0),
    attestation_score: Math.min(1, (counts["TEAM_ATTESTATION"] ?? 0) * 0.25),
  };

  const lpi: LPIInput = {
    deployment_probes_passed: counts["DEPLOYMENT_HTTP_PROBE_OK"] ?? 0,
    deployment_probes_total:
      (counts["DEPLOYMENT_HTTP_PROBE_OK"] ?? 0) +
      (counts["DEPLOYMENT_HTTP_PROBE_FAIL"] ?? 0),
    github_contributor_verified: counts["GITHUB_CONTRIBUTOR_VERIFIED"] ?? 0,
    github_contributor_total:
      (counts["GITHUB_CONTRIBUTOR_VERIFIED"] ?? 0) +
      (counts["GITHUB_CONTRIBUTOR_FAIL"] ?? 0),
    live_challenge_score: counts["LIVE_CHALLENGE_RESULT"] ?? 0,
  };

  return { ec, aoi, rc, lpi };
}

// ─── Main Score Computation ─────────────────────────────────────────────

export interface ComputeV3Input {
  builderId: string;
  evidence: ScoreEvidence[];
  counts: Record<string, number>;
  tenureDays: number;
  previousScore: number | null;
  previousSkillScores: number[] | null;
  currentSkillScores: number[];
  allAttestationsForBuilder: ScoreEvidence[];
  model: ScoringModelVersion;
  triggerReason: string;
  hasMilestoneEvidence: boolean;
}

export function computeForgeScoreV3(input: ComputeV3Input): V3ScoreResult {
  const { model, evidence, counts, tenureDays, previousScore } = input;
  const tenureMonths = tenureDays / 30;

  // 1. Build dimension inputs from evidence
  const dimInputs = buildDimensionInputs(evidence, counts, tenureDays);

  // 2. Compute raw dimensions
  const dimensions: V3DimensionScores = {
    ec: computeEC(dimInputs.ec),
    aoi: computeAOI(dimInputs.aoi),
    rc: computeRC(dimInputs.rc),
    lpi: computeLPI(dimInputs.lpi),
  };

  // 3. Weighted composite (0-100)
  const composite = computeComposite(dimensions, model.weights);

  // 4. BCM
  const bcm = computeBCM(
    evidence,
    tenureDays,
    input.previousSkillScores,
    input.currentSkillScores,
    input.allAttestationsForBuilder
  );

  const adjustedComposite = composite * bcm.multiplier;

  // 5. Map to 100-999
  let raw3digit = mapTo3Digit(adjustedComposite);

  // 6. Apply inactivity decay
  const lastEvidenceTs = evidence.length > 0
    ? Math.max(...evidence.map((e) => new Date(e.created_at).getTime()))
    : 0;
  const recencyDays = lastEvidenceTs > 0
    ? (Date.now() - lastEvidenceTs) / (24 * 60 * 60 * 1000)
    : 365;

  const { score: afterDecay, decayApplied } = applyInactivityDecay(
    raw3digit,
    recencyDays,
    model.caps
  );
  raw3digit = afterDecay;

  // 7. Apply tenure gates
  raw3digit = applyTenureGates(raw3digit, tenureMonths, model.caps);

  // 8. Apply movement caps
  const { score: finalScore, cappedDelta } = applyMovementCaps(
    raw3digit,
    previousScore,
    input.hasMilestoneEvidence,
    model.caps
  );

  // 9. Clamp to valid range
  const score = clamp(finalScore, 100, 999);

  // Confidence based on evidence volume and diversity
  const typeCount = Object.keys(counts).length;
  const confidence = Math.round(
    100 * clamp01(
      0.3 * Math.min(1, evidence.length / 20) +
      0.3 * Math.min(1, typeCount / 8) +
      0.2 * Math.min(1, tenureMonths / 6) +
      0.2 * (bcm.flags.length === 0 ? 1 : 0.5)
    )
  );

  const breakdown: V3ScoreBreakdown = {
    dimensions,
    composite,
    bcm,
    adjusted_composite: adjustedComposite,
    raw_3digit: raw3digit,
    capped_delta: cappedDelta,
    final_score: score,
    confidence,
    tenure_months: Math.round(tenureMonths * 10) / 10,
    model_version: model.version,
    inactivity_decay_applied: decayApplied,
  };

  return {
    score,
    previous_score: previousScore,
    delta: previousScore != null ? score - previousScore : 0,
    breakdown,
    anomaly_flags: bcm.flags,
    evidence_ids: evidence.map((e) => e.id),
  };
}
