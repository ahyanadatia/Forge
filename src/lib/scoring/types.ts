/**
 * Forge Score V3 — Type definitions for the production-grade scoring system.
 */

// ─── Evidence Types ────────────────────────────────────────────────────────

export type EvidenceType =
  | "DEPLOYMENT_HTTP_PROBE_OK"
  | "DEPLOYMENT_HTTP_PROBE_FAIL"
  | "GITHUB_CONTRIBUTOR_VERIFIED"
  | "GITHUB_CONTRIBUTOR_FAIL"
  | "REPO_STACK_INFERRED"
  | "PR_REVIEW_ACTIVITY"
  | "DELIVERY_VERIFIED"
  | "DELIVERY_SUSTAINED"
  | "DELIVERY_DROPPED"
  | "TEAM_ATTESTATION"
  | "TEAM_JOINED"
  | "TEAM_DEPARTED"
  | "PROJECT_COMPLETED"
  | "PROJECT_ABANDONED"
  | "NO_SHOW_FLAG"
  | "LIVE_CHALLENGE_RESULT"
  | "ANOMALY_BURST_ACTIVITY"
  | "ANOMALY_TEMPLATE_CLONE"
  | "ANOMALY_ATTESTATION_RING"
  | "ARCH_DECISION_LOG"
  | "OWNERSHIP_VERIFIED_STRONG"
  | "OWNERSHIP_VERIFIED_WEAK"
  | "CONSISTENCY_ACTIVE_WEEK"
  | "SKILL_EVIDENCE_INFERRED";

export type EvidenceSource =
  | "probe_http"
  | "probe_github"
  | "probe_stack"
  | "platform_event"
  | "user_action"
  | "anomaly_detector"
  | "attestation"
  | "system";

export interface ScoreEvidence {
  id: string;
  builder_id: string;
  project_id: string | null;
  delivery_id: string | null;
  type: EvidenceType;
  source: EvidenceSource;
  payload: Record<string, unknown>;
  confidence: number;
  hash: string;
  superseded_by: string | null;
  created_at: string;
}

// ─── Score Model ──────────────────────────────────────────────────────────

export interface ModelWeights {
  ec_weight: number;   // Execution Consistency
  aoi_weight: number;  // AI-Orchestration Intelligence
  rc_weight: number;   // Reliability & Commitment
  lpi_weight: number;  // Live Performance Index
  self_report_max_weight: number;
  self_report_evidence_threshold: number;
}

export interface ModelCaps {
  normal_delta_max: number;
  milestone_delta_max: number;
  tier_800_min_months: number;
  tier_900_min_months: number;
  inactivity_decay_start_days: number;
  inactivity_decay_rate_per_day: number;
  bcm_min: number;
  bcm_max: number;
}

export interface ScoringModelVersion {
  version: string;
  weights: ModelWeights;
  caps: ModelCaps;
  tier_config: {
    floors: Record<string, number>;
    score_min: number;
    score_max: number;
  };
  effective_from: string;
}

// ─── Dimension Inputs ─────────────────────────────────────────────────────

export interface ECInput {
  verified_deliveries: number;
  sustained_deliveries: number;
  team_completed_deliveries: number;
  active_weeks_last_12: number;
  deliveries_last_6m: number;
  recency_days: number;
  evidence_additions_count: number;
}

export interface AOIInput {
  stack_depth_score: number;        // from dependency parsing, 0-1
  ownership_strong_count: number;   // OWNERSHIP_VERIFIED_STRONG evidence
  repo_complexity_signals: number;  // multi-service, CI, testing detected
  arch_decision_logs: number;       // documented architecture choices
  pr_review_count: number;
}

export interface RCInput {
  projects_joined: number;
  projects_completed: number;
  projects_abandoned: number;
  projects_late: number;
  no_show_count: number;
  team_departure_clean: number;     // left with reason, not ghosted
  team_departure_ghost: number;     // left_at set with no deliveries
  attestation_score: number;        // weighted by attester credibility, 0-1
}

export interface LPIInput {
  deployment_probes_passed: number;
  deployment_probes_total: number;
  github_contributor_verified: number;
  github_contributor_total: number;
  live_challenge_score: number;     // 0-1, future
}

// ─── Anti-Gaming ──────────────────────────────────────────────────────────

export interface AnomalySignals {
  burstiness_gini: number;         // 0=uniform, 1=all-in-one-day
  evidence_density_ratio: number;  // evidence count / tenure days
  skill_jump_magnitude: number;    // max delta in any skill dimension
  template_clone_probability: number; // 0-1
  attestation_ring_score: number;  // 0-1, reciprocal attestation detection
}

export interface BCMResult {
  multiplier: number;              // 0.6 - 1.05
  flags: string[];                 // which anomaly detectors fired
  details: Record<string, number>; // per-detector values
}

// ─── Score Output ─────────────────────────────────────────────────────────

export interface V3DimensionScores {
  ec: number;   // 0-100
  aoi: number;  // 0-100
  rc: number;   // 0-100
  lpi: number;  // 0-100
}

export interface V3ScoreBreakdown {
  dimensions: V3DimensionScores;
  composite: number;       // 0-100 weighted
  bcm: BCMResult;
  adjusted_composite: number; // composite * bcm
  raw_3digit: number;      // before caps/gates
  capped_delta: number;    // actual delta applied
  final_score: number;     // 100-999
  confidence: number;      // 0-100
  tenure_months: number;
  model_version: string;
  inactivity_decay_applied: number;
}

export interface V3ScoreResult {
  score: number;           // 100-999
  previous_score: number | null;
  delta: number;
  breakdown: V3ScoreBreakdown;
  anomaly_flags: string[];
  evidence_ids: string[];
}

// ─── Recompute Queue ──────────────────────────────────────────────────────

export type RecomputeTrigger =
  | "delivery_verified"
  | "probe_result"
  | "attestation_added"
  | "project_status_change"
  | "team_departure"
  | "anomaly_flagged"
  | "manual"
  | "scheduled";
