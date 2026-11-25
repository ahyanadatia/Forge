/**
 * View model for the V3 Forge Score.
 *
 * The scoring pipeline stores a full breakdown as JSON in `score_history`.
 * This module turns that untrusted JSON into something the UI can render
 * without defensive checks scattered through components.
 */
import { getScoreBand, getConfidenceLabel, type ScoreBand, type ConfidenceLabel } from "@/lib/forge-score";

export type V3DimensionKey = "ec" | "rc" | "aoi" | "lpi";

export interface V3DimensionView {
  key: V3DimensionKey;
  label: string;
  description: string;
  value: number; // 0-100
  weight: number; // 0-1
}

export interface V3HistoryPoint {
  score: number;
  computedAt: string;
}

export interface V3ScoreView {
  score: number; // 100-999
  band: ScoreBand;
  confidence: number; // 0-100
  confidenceLabel: ConfidenceLabel;
  delta: number | null;
  dimensions: V3DimensionView[];
  multiplier: number | null;
  anomalyFlags: string[];
  tenureMonths: number | null;
  modelVersion: string | null;
  computedAt: string | null;
  /** Points that keep the score out of the next tier, if any. */
  nextBand: { band: ScoreBand; pointsAway: number } | null;
}

export const V3_DIMENSIONS: Record<V3DimensionKey, { label: string; description: string; defaultWeight: number }> = {
  ec: {
    label: "Execution consistency",
    description: "Verified deliveries, how recent they are and how steadily they arrive.",
    defaultWeight: 0.3,
  },
  rc: {
    label: "Reliability",
    description: "Projects completed versus abandoned, clean exits and team attestations.",
    defaultWeight: 0.3,
  },
  aoi: {
    label: "Engineering depth",
    description: "Stack depth, ownership of the code, CI and tests, documented decisions.",
    defaultWeight: 0.2,
  },
  lpi: {
    label: "Live performance",
    description: "Deployments that respond and GitHub contributions that check out.",
    defaultWeight: 0.2,
  },
};

const BAND_THRESHOLDS: Array<{ band: ScoreBand; min: number }> = [
  { band: "Developing", min: 200 },
  { band: "Proven", min: 400 },
  { band: "Strong", min: 600 },
  { band: "Elite", min: 800 },
];

const ANOMALY_LABELS: Record<string, string> = {
  HIGH_BURSTINESS: "Most activity arrived in a short burst",
  MODERATE_BURSTINESS: "Activity is somewhat bursty",
  ABNORMAL_EVIDENCE_DENSITY: "Unusually dense evidence for account age",
  SUSPICIOUS_SKILL_JUMP: "Unusually large jump in one skill",
  TEMPLATE_CLONE_DETECTED: "A repository looks like a cloned template",
  ATTESTATION_RING_DETECTED: "Reciprocal attestations detected",
};

function num(v: unknown, fallback: number | null = null): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function describeAnomaly(flag: string): string {
  return ANOMALY_LABELS[flag] ?? flag.replace(/_/g, " ").toLowerCase();
}

export function nextBandFor(score: number): { band: ScoreBand; pointsAway: number } | null {
  const next = BAND_THRESHOLDS.find((t) => t.min > score);
  return next ? { band: next.band, pointsAway: next.min - score } : null;
}

export interface V3Row {
  score_v3: unknown;
  delta?: unknown;
  breakdown?: unknown;
  anomaly_flags?: unknown;
  model_version?: unknown;
  computed_at?: unknown;
}

/**
 * Builds the view from a `score_history` row (or a builders row that only
 * has `score_v3`). Returns null when there is no valid V3 score yet.
 */
export function toV3View(row: V3Row | null | undefined, weights?: Partial<Record<V3DimensionKey, number>>): V3ScoreView | null {
  if (!row) return null;
  const score = num(row.score_v3);
  if (score == null || score < 100 || score > 999) return null;
  const rounded = Math.round(score);

  const breakdown = asRecord(row.breakdown);
  const dims = asRecord(breakdown.dimensions);
  const bcm = asRecord(breakdown.bcm);

  const dimensions: V3DimensionView[] = (Object.keys(V3_DIMENSIONS) as V3DimensionKey[]).map((key) => ({
    key,
    label: V3_DIMENSIONS[key].label,
    description: V3_DIMENSIONS[key].description,
    value: Math.round(clamp(num(dims[key], 0) ?? 0, 0, 100)),
    weight: clamp(weights?.[key] ?? V3_DIMENSIONS[key].defaultWeight, 0, 1),
  }));

  const confidence = Math.round(clamp(num(breakdown.confidence, 0) ?? 0, 0, 100));

  const rawFlags = Array.isArray(row.anomaly_flags) ? row.anomaly_flags : Array.isArray(bcm.flags) ? bcm.flags : [];
  const anomalyFlags = rawFlags.filter((f): f is string => typeof f === "string" && f.length > 0);

  return {
    score: rounded,
    band: getScoreBand(rounded),
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    delta: num(row.delta),
    dimensions,
    multiplier: num(bcm.multiplier),
    anomalyFlags,
    tenureMonths: num(breakdown.tenure_months),
    modelVersion: typeof row.model_version === "string" ? row.model_version : null,
    computedAt: typeof row.computed_at === "string" ? row.computed_at : null,
    nextBand: nextBandFor(rounded),
  };
}

/** Oldest-first series for a sparkline, ignoring malformed rows. */
export function toHistorySeries(rows: Array<{ score_v3: unknown; computed_at: unknown }> | null | undefined): V3HistoryPoint[] {
  if (!rows) return [];
  return rows
    .map((r) => ({ score: num(r.score_v3), computedAt: typeof r.computed_at === "string" ? r.computed_at : null }))
    .filter((p): p is V3HistoryPoint => p.score != null && p.score >= 100 && p.score <= 999 && p.computedAt != null)
    .sort((a, b) => a.computedAt.localeCompare(b.computedAt));
}

/** Weakest dimension first: where the builder should focus next. */
export function focusDimension(view: V3ScoreView): V3DimensionView {
  return [...view.dimensions].sort((a, b) => a.value * (1 + a.weight) - b.value * (1 + b.weight))[0];
}
