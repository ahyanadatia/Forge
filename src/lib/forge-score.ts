/**
 * Forge Score V2 — Deterministic Execution Credibility Metric
 *
 * Score: 0–1000
 * Dimensions (0–100 each):
 *   DS  Delivery Success   45%
 *   R   Reliability         30%
 *   DQ  Delivery Quality    15%
 *   K   Consistency         10%
 * Confidence: 0–100
 * Final: round(1000 * base * mult) clamped to 0–1000
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ForgeScoreInput {
  delivery: DeliverySuccessInput;
  reliability: ReliabilityInput;
  quality: DeliveryQualityInput;
  consistency: ConsistencyInput;
  confidence: ConfidenceInput;
}

export interface DeliverySuccessInput {
  n_verified_deliveries: number;
  n_sustained_deliveries: number;
  n_team_completed_deliveries: number;
}

export interface ReliabilityInput {
  projects_joined: number;
  projects_completed: number;
  projects_abandoned: number;
  projects_late: number;
  projects_no_show: number;
}

export interface DeliveryQualityInput {
  deliveries: DeliveryQualityItem[];
}

export interface DeliveryQualityItem {
  verification_signals: VerificationSignals;
  depth_flags: DepthFlags;
  sustained_90_days: boolean;
  verified: boolean;
  ownership_signals: OwnershipSignals;
  update_windows_24h_count: number;
}

export interface VerificationSignals {
  deploy_reachable: boolean | null;
  repo_exists: boolean | null;
  contribution_evidence: boolean | null;
  timeline_evidence: boolean | null;
  collaborator_attestation: boolean | null;
}

export interface DepthFlags {
  has_auth: boolean;
  has_database: boolean;
  has_api: boolean;
  has_external_integrations: boolean;
  has_payments: boolean;
  has_background_jobs: boolean;
}

export interface OwnershipSignals {
  deployment_owner_verified: boolean | null;
  domain_owner_verified: boolean | null;
  primary_operator_likely: boolean | null;
}

export interface ConsistencyInput {
  active_weeks_last_12: number;
  deliveries_last_6m: number;
  recency_days: number;
}

export interface ConfidenceInput {
  n_verified_deliveries: number;
  n_sustained_deliveries: number;
  n_distinct_collaborators: number;
  n_outcomes: number;
}

export interface ForgeScoreOutput {
  forge_score: number;
  confidence_score: number;
  delivery_success_score: number;
  reliability_score: number;
  delivery_quality_score: number;
  consistency_score: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function computeForgeScoreV2(input: ForgeScoreInput): ForgeScoreOutput {
  const DS = computeDeliverySuccess(input.delivery);
  const R = computeReliability(input.reliability);
  const DQ = computeDeliveryQuality(input.quality);
  const K = computeConsistency(input.consistency);
  const CONF = computeConfidence(input.confidence);

  const base =
    0.45 * (DS / 100) +
    0.30 * (R / 100) +
    0.15 * (DQ / 100) +
    0.10 * (K / 100);

  const mult = 0.60 + 0.40 * (CONF / 100);

  const forge_score = clamp(Math.round(1000 * base * mult), 0, 1000);

  return {
    forge_score,
    confidence_score: CONF,
    delivery_success_score: DS,
    reliability_score: R,
    delivery_quality_score: DQ,
    consistency_score: K,
  };
}

// ─── DS: Delivery Success ───────────────────────────────────────────────────

export function computeDeliverySuccess(input: DeliverySuccessInput): number {
  const delivery_points =
    1.0 * input.n_verified_deliveries +
    1.5 * input.n_sustained_deliveries +
    0.5 * input.n_team_completed_deliveries;

  const frac = 1 - Math.exp(-delivery_points / 8);
  return Math.round(100 * clamp01(frac));
}

// ─── R: Reliability ─────────────────────────────────────────────────────────

export function computeReliability(input: ReliabilityInput): number {
  const J = input.projects_joined;
  const Comp = input.projects_completed;
  const Ab = input.projects_abandoned;
  const Late = input.projects_late;
  const NoShow = input.projects_no_show;

  if (J === 0 && Comp === 0) return 0;

  const p_complete = (Comp + 2) / (J + 3);

  const pen = Math.exp(
    -(1.2 * Ab + 0.6 * Late + 2.0 * NoShow) / Math.max(1, J)
  );

  const r_frac = p_complete * pen;
  return Math.round(100 * clamp01(r_frac));
}

// ─── DQ: Delivery Quality ───────────────────────────────────────────────────

export function computeDeliveryQuality(input: DeliveryQualityInput): number {
  if (input.deliveries.length === 0) return 0;

  let dpv_sum = 0;
  for (const d of input.deliveries) {
    dpv_sum += computeDeliveryPointValue(d);
  }

  const frac = 1 - Math.exp(-dpv_sum / 6);
  return Math.round(100 * clamp01(frac));
}

function computeDeliveryPointValue(d: DeliveryQualityItem): number {
  const V = computeVerificationStrength(d.verification_signals);
  const Depth = computeDepth(d.depth_flags);
  const Durability = d.sustained_90_days ? 1 : d.verified ? 0.3 : 0;
  const Ownership = computeOwnership(d.ownership_signals);
  const Iteration = 1 - Math.exp(-d.update_windows_24h_count / 6);

  return V * (0.35 * Depth + 0.25 * Durability + 0.20 * Ownership + 0.20 * Iteration);
}

function computeVerificationStrength(signals: VerificationSignals): number {
  const weights: [keyof VerificationSignals, number][] = [
    ["deploy_reachable", 0.30],
    ["repo_exists", 0.15],
    ["contribution_evidence", 0.20],
    ["timeline_evidence", 0.20],
    ["collaborator_attestation", 0.15],
  ];

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of weights) {
    const val = signals[key];
    if (val === null || val === undefined) continue;
    totalWeight += weight;
    if (val) weightedSum += weight;
  }

  if (totalWeight === 0) return 0;
  return clamp01(weightedSum / totalWeight);
}

function computeDepth(flags: DepthFlags): number {
  const booleans = [
    flags.has_auth,
    flags.has_database,
    flags.has_api,
    flags.has_external_integrations,
    flags.has_payments,
    flags.has_background_jobs,
  ];
  const trueCount = booleans.filter(Boolean).length;
  return clamp01(trueCount / 6);
}

function computeOwnership(signals: OwnershipSignals): number {
  const values = [
    signals.deployment_owner_verified,
    signals.domain_owner_verified,
    signals.primary_operator_likely,
  ];

  const available = values.filter((v) => v !== null && v !== undefined);
  if (available.length === 0) return 0;

  const trueCount = available.filter(Boolean).length;
  return clamp01(trueCount / available.length);
}

// ─── K: Consistency ─────────────────────────────────────────────────────────

export function computeConsistency(input: ConsistencyInput): number {
  const cadence = 1 - Math.exp(-input.deliveries_last_6m / 3);
  const activity = clamp01(input.active_weeks_last_12 / 12);
  const recency = Math.exp(-input.recency_days / 90);

  const frac = 0.40 * cadence + 0.35 * activity + 0.25 * recency;
  return Math.round(100 * clamp01(frac));
}

// ─── CONF: Confidence ───────────────────────────────────────────────────────

export function computeConfidence(input: ConfidenceInput): number {
  const sum =
    0.9 * input.n_verified_deliveries +
    1.3 * input.n_sustained_deliveries +
    0.5 * input.n_distinct_collaborators +
    0.6 * input.n_outcomes;

  const frac = 1 - Math.exp(-sum / 10);
  return Math.round(100 * clamp01(frac));
}

// ─── Score Bands ────────────────────────────────────────────────────────────

export type ScoreBand = "New" | "Developing" | "Proven" | "Strong" | "Elite";

export function getScoreBand(score: number): ScoreBand {
  if (score >= 800) return "Elite";
  if (score >= 600) return "Strong";
  if (score >= 400) return "Proven";
  if (score >= 200) return "Developing";
  return "New";
}

export type ConfidenceLabel = "High" | "Medium" | "Low";

export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 65) return "High";
  if (confidence >= 35) return "Medium";
  return "Low";
}

// ─── Improvement Suggestions ────────────────────────────────────────────────

export function getImproveSuggestions(output: ForgeScoreOutput): string[] {
  const dimensions: { key: string; score: number; suggestions: string[] }[] = [
    {
      key: "delivery_success",
      score: output.delivery_success_score,
      suggestions: [
        "Submit and verify more deliveries to build your execution record.",
        "Sustained deliveries (active 90+ days) carry extra weight.",
        "Team project completions also contribute to delivery success.",
      ],
    },
    {
      key: "reliability",
      score: output.reliability_score,
      suggestions: [
        "Complete projects you commit to — abandonment heavily impacts this score.",
        "Deliver on time when deadlines are set.",
        "Avoid accepting projects you can't commit to.",
      ],
    },
    {
      key: "delivery_quality",
      score: output.delivery_quality_score,
      suggestions: [
        "Ensure deployments are reachable and repos are public for verification.",
        "Build deeper systems (auth, databases, APIs) for higher quality scores.",
        "Iterate on deliveries over time — update windows demonstrate sustained ownership.",
      ],
    },
    {
      key: "consistency",
      score: output.consistency_score,
      suggestions: [
        "Stay active regularly — weekly contributions build consistency.",
        "Deliver at a steady cadence rather than in bursts.",
        "Recent activity counts — keep your profile current.",
      ],
    },
  ];

  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const suggestions: string[] = [];

  for (const dim of sorted.slice(0, 2)) {
    if (dim.score < 70) {
      suggestions.push(dim.suggestions[0]);
      if (dim.score < 40 && dim.suggestions[1]) {
        suggestions.push(dim.suggestions[1]);
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("Your score is strong across all dimensions. Keep delivering.");
  }

  return suggestions;
}
