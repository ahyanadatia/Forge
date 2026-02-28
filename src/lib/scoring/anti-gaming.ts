/**
 * Anti-Gaming: Behavioral Coherence Multiplier (BCM)
 *
 * Detects anomalous patterns that suggest score manipulation.
 * Returns a multiplier between 0.6 and 1.05.
 * Honest long-term builders get 1.0-1.05.
 * Detected anomalies reduce the multiplier.
 */

import type { AnomalySignals, BCMResult, ScoreEvidence } from "./types";

/**
 * Gini coefficient: measures inequality in a distribution.
 * 0 = perfectly uniform, 1 = all concentrated in one bucket.
 * Used to detect activity burstiness.
 */
export function giniCoefficient(values: number[]): number {
  if (values.length < 2) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;

  let sumOfDiffs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDiffs += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return sumOfDiffs / (2 * n * n * mean);
}

/**
 * Compute burstiness from evidence timestamps.
 * Buckets evidence into weekly bins and computes Gini.
 */
export function computeBurstiness(evidence: ScoreEvidence[]): number {
  if (evidence.length < 3) return 0;

  const timestamps = evidence.map((e) => new Date(e.created_at).getTime());
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const rangeWeeks = Math.max(1, (maxTs - minTs) / (7 * 24 * 60 * 60 * 1000));

  const bucketCount = Math.max(4, Math.ceil(rangeWeeks));
  const bucketSize = (maxTs - minTs + 1) / bucketCount;
  const buckets = new Array(bucketCount).fill(0);

  for (const ts of timestamps) {
    const idx = Math.min(bucketCount - 1, Math.floor((ts - minTs) / bucketSize));
    buckets[idx]++;
  }

  return giniCoefficient(buckets);
}

/**
 * Detect attestation rings: reciprocal attestations between a small group.
 * Returns 0-1 where higher = more suspicious.
 */
export function detectAttestationRing(
  evidence: ScoreEvidence[],
  allAttestationsForBuilder: ScoreEvidence[]
): number {
  const attestations = evidence.filter((e) => e.type === "TEAM_ATTESTATION");
  if (attestations.length < 2) return 0;

  const attesters = new Set<string>();
  for (const a of attestations) {
    const attesterId = (a.payload as any).attester_id;
    if (attesterId) attesters.add(attesterId);
  }

  if (attesters.size < 2) return 0;

  // Check for reciprocal: did this builder attest for any of their attesters?
  let reciprocalCount = 0;
  for (const attester of attesters) {
    const reciprocal = allAttestationsForBuilder.some(
      (e) =>
        e.type === "TEAM_ATTESTATION" &&
        e.builder_id === attester &&
        (e.payload as any).attester_id === evidence[0]?.builder_id
    );
    if (reciprocal) reciprocalCount++;
  }

  return Math.min(1, reciprocalCount / attesters.size);
}

/**
 * Detect template clones: projects with extremely similar structure
 * created in rapid succession.
 */
export function detectTemplateClone(evidence: ScoreEvidence[]): number {
  const stackInferences = evidence.filter((e) => e.type === "REPO_STACK_INFERRED");
  if (stackInferences.length < 2) return 0;

  const stacks = stackInferences.map((e) => {
    const langs = Object.keys((e.payload as any).languages ?? {}).sort().join(",");
    return langs;
  });

  // Count identical stacks
  const stackCounts: Record<string, number> = {};
  for (const s of stacks) {
    stackCounts[s] = (stackCounts[s] ?? 0) + 1;
  }

  const maxDupes = Math.max(...Object.values(stackCounts));
  if (maxDupes < 3) return 0;

  return Math.min(1, (maxDupes - 2) / 5);
}

/**
 * Compute the full BCM from evidence.
 */
export function computeBCM(
  evidence: ScoreEvidence[],
  tenureDays: number,
  previousSkillScores: number[] | null,
  currentSkillScores: number[],
  allAttestationsForBuilder: ScoreEvidence[]
): BCMResult {
  const flags: string[] = [];
  const details: Record<string, number> = {};

  // 1. Burstiness
  const burstiness = computeBurstiness(evidence);
  details.burstiness_gini = burstiness;
  let penalty = 0;

  if (burstiness > 0.7) {
    penalty += 0.15;
    flags.push("HIGH_BURSTINESS");
  } else if (burstiness > 0.5) {
    penalty += 0.05;
    flags.push("MODERATE_BURSTINESS");
  }

  // 2. Evidence density vs tenure
  const density = tenureDays > 0 ? evidence.length / tenureDays : 0;
  details.evidence_density = density;
  if (density > 3) {
    penalty += 0.10;
    flags.push("ABNORMAL_EVIDENCE_DENSITY");
  }

  // 3. Skill jump detection
  if (previousSkillScores && previousSkillScores.length === currentSkillScores.length) {
    const maxJump = Math.max(
      ...currentSkillScores.map((c, i) => Math.max(0, c - previousSkillScores[i]))
    );
    details.skill_jump_magnitude = maxJump;
    if (maxJump > 40) {
      penalty += 0.10;
      flags.push("SUSPICIOUS_SKILL_JUMP");
    }
  }

  // 4. Template clone detection
  const templateScore = detectTemplateClone(evidence);
  details.template_clone_probability = templateScore;
  if (templateScore > 0.3) {
    penalty += 0.10;
    flags.push("TEMPLATE_CLONE_DETECTED");
  }

  // 5. Attestation ring detection
  const ringScore = detectAttestationRing(evidence, allAttestationsForBuilder);
  details.attestation_ring_score = ringScore;
  if (ringScore > 0.5) {
    penalty += 0.10;
    flags.push("ATTESTATION_RING_DETECTED");
  }

  // Bonus for long-tenure, steady builders
  let bonus = 0;
  if (tenureDays > 120 && burstiness < 0.3 && flags.length === 0) {
    bonus = 0.05;
  }

  const multiplier = Math.max(0.6, Math.min(1.05, 1.0 + bonus - penalty));

  return { multiplier, flags, details };
}
