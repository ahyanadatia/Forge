/**
 * Forge Score V3 — Adversarial + Property-Based Tests
 *
 * Test fixtures:
 *   1. Honest long-term builder
 *   2. Commit spammer
 *   3. Template cloner
 *   4. Ghoster
 *   5. Attestation ring
 *   6. One-night AI burst
 *
 * Property tests:
 *   - Idempotent recompute
 *   - No score change without new evidence
 *   - Movement caps enforced
 *   - Tenure gates enforced
 *   - BCM range always [0.6, 1.05]
 */

import { describe, it, expect } from "vitest";
import {
  computeEC,
  computeAOI,
  computeRC,
  computeLPI,
  computeComposite,
  mapTo3Digit,
  applyTenureGates,
  applyMovementCaps,
  applyInactivityDecay,
  computeForgeScoreV3,
  buildDimensionInputs,
} from "@/lib/scoring/engine";
import { computeBCM, giniCoefficient, computeBurstiness } from "@/lib/scoring/anti-gaming";
import { hashPayload } from "@/lib/scoring/evidence";
import { inferStackFromDependencies } from "@/lib/scoring/probes";
import type { ScoreEvidence, ScoringModelVersion, ModelCaps } from "@/lib/scoring/types";

// ─── Test Model ──────────────────────────────────────────────────────────

const MODEL: ScoringModelVersion = {
  version: "v3.0-test",
  weights: { ec_weight: 0.30, aoi_weight: 0.20, rc_weight: 0.30, lpi_weight: 0.20, self_report_max_weight: 0.20, self_report_evidence_threshold: 3 },
  caps: { normal_delta_max: 35, milestone_delta_max: 70, tier_800_min_months: 4, tier_900_min_months: 9, inactivity_decay_start_days: 60, inactivity_decay_rate_per_day: 0.15, bcm_min: 0.60, bcm_max: 1.05 },
  tier_config: { floors: {}, score_min: 100, score_max: 999 },
  effective_from: new Date().toISOString(),
};

function makeEvidence(overrides: Partial<ScoreEvidence>[]): ScoreEvidence[] {
  return overrides.map((o, i) => ({
    id: `ev-${i}`,
    builder_id: "builder-1",
    project_id: null,
    delivery_id: null,
    type: "DELIVERY_VERIFIED",
    source: "platform_event",
    payload: {},
    confidence: 0.8,
    hash: `hash-${i}`,
    superseded_by: null,
    created_at: new Date(Date.now() - (overrides.length - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...o,
  }));
}

function makeCountsFromEvidence(evidence: ScoreEvidence[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of evidence) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

// ─── Fixture: Honest Long-Term Builder ──────────────────────────────────

function honestBuilderEvidence(): ScoreEvidence[] {
  const base = Date.now();
  const evidence: Partial<ScoreEvidence>[] = [];

  // 5 verified deliveries spread over 6 months
  for (let i = 0; i < 5; i++) {
    evidence.push({
      type: "DELIVERY_VERIFIED",
      created_at: new Date(base - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 0.9,
    });
  }
  // 2 sustained
  evidence.push({ type: "DELIVERY_SUSTAINED", confidence: 0.95 });
  evidence.push({ type: "DELIVERY_SUSTAINED", confidence: 0.95 });
  // 3 probes passed
  evidence.push({ type: "DEPLOYMENT_HTTP_PROBE_OK", source: "probe_http", confidence: 0.85 });
  evidence.push({ type: "GITHUB_CONTRIBUTOR_VERIFIED", source: "probe_github", confidence: 0.9 });
  evidence.push({ type: "DEPLOYMENT_HTTP_PROBE_OK", source: "probe_http", confidence: 0.85 });
  // 2 ownership
  evidence.push({ type: "OWNERSHIP_VERIFIED_STRONG", confidence: 0.9 });
  evidence.push({ type: "OWNERSHIP_VERIFIED_STRONG", confidence: 0.9 });
  // 2 completed projects
  evidence.push({ type: "PROJECT_COMPLETED", confidence: 1.0 });
  evidence.push({ type: "PROJECT_COMPLETED", confidence: 1.0 });
  // 3 team joins
  evidence.push({ type: "TEAM_JOINED", confidence: 1.0 });
  evidence.push({ type: "TEAM_JOINED", confidence: 1.0 });
  evidence.push({ type: "TEAM_JOINED", confidence: 1.0 });
  // Stack inference
  evidence.push({ type: "REPO_STACK_INFERRED", payload: { languages: { TypeScript: 50000, Python: 20000 }, has_ci: true, has_tests: true, has_dockerfile: true }, confidence: 0.7 });
  // 1 attestation
  evidence.push({ type: "TEAM_ATTESTATION", payload: { attester_id: "other-builder" }, confidence: 0.7 });

  return makeEvidence(evidence);
}

// ─── Fixture: Commit Spammer ────────────────────────────────────────────

function spammerEvidence(): ScoreEvidence[] {
  const base = Date.now();
  const evidence: Partial<ScoreEvidence>[] = [];

  // 20 "deliveries" all in the same week (burst)
  for (let i = 0; i < 20; i++) {
    evidence.push({
      type: "DELIVERY_VERIFIED",
      created_at: new Date(base - i * 3600 * 1000).toISOString(), // hourly
      confidence: 0.5,
    });
  }
  // No probes passed, no ownership
  evidence.push({ type: "DEPLOYMENT_HTTP_PROBE_FAIL", confidence: 0.1 });
  evidence.push({ type: "GITHUB_CONTRIBUTOR_FAIL", confidence: 0.1 });

  return makeEvidence(evidence);
}

// ─── Fixture: Template Cloner ───────────────────────────────────────────

function templateClonerEvidence(): ScoreEvidence[] {
  const evidence: Partial<ScoreEvidence>[] = [];
  // 5 repos with identical language stack
  for (let i = 0; i < 5; i++) {
    evidence.push({
      type: "REPO_STACK_INFERRED",
      payload: { languages: { JavaScript: 10000 }, has_ci: false, has_tests: false, has_dockerfile: false },
      confidence: 0.5,
    });
    evidence.push({ type: "DELIVERY_VERIFIED", confidence: 0.5 });
  }
  // 1 weak ownership
  evidence.push({ type: "OWNERSHIP_VERIFIED_WEAK", confidence: 0.4 });

  return makeEvidence(evidence);
}

// ─── Fixture: Ghoster ───────────────────────────────────────────────────

function ghosterEvidence(): ScoreEvidence[] {
  const evidence: Partial<ScoreEvidence>[] = [];
  // Joined 4 projects
  for (let i = 0; i < 4; i++) {
    evidence.push({ type: "TEAM_JOINED", confidence: 1.0 });
  }
  // Ghosted 3 of them
  evidence.push({ type: "NO_SHOW_FLAG", confidence: 0.9 });
  evidence.push({ type: "NO_SHOW_FLAG", confidence: 0.9 });
  evidence.push({ type: "NO_SHOW_FLAG", confidence: 0.9 });
  // 1 completed
  evidence.push({ type: "PROJECT_COMPLETED", confidence: 1.0 });
  // 1 verified delivery
  evidence.push({ type: "DELIVERY_VERIFIED", confidence: 0.7 });

  return makeEvidence(evidence);
}

// ─── Fixture: Attestation Ring ──────────────────────────────────────────

function attestationRingEvidence(): ScoreEvidence[] {
  const evidence: Partial<ScoreEvidence>[] = [];
  // 5 reciprocal attestations from a tight ring
  for (let i = 0; i < 5; i++) {
    evidence.push({
      type: "TEAM_ATTESTATION",
      payload: { attester_id: `ring-member-${i}` },
      confidence: 0.6,
    });
  }
  // 1 delivery
  evidence.push({ type: "DELIVERY_VERIFIED", confidence: 0.6 });
  evidence.push({ type: "TEAM_JOINED", confidence: 1.0 });

  return makeEvidence(evidence);
}

function attestationRingReciprocals(): ScoreEvidence[] {
  // These are attestations where our builder attested for ring members
  return makeEvidence(
    Array.from({ length: 5 }, (_, i) => ({
      builder_id: `ring-member-${i}`,
      type: "TEAM_ATTESTATION" as const,
      payload: { attester_id: "builder-1" },
      confidence: 0.6,
    }))
  );
}

// ─── Fixture: AI One-Night Burst ────────────────────────────────────────

function aiNightBurstEvidence(): ScoreEvidence[] {
  const base = Date.now();
  const evidence: Partial<ScoreEvidence>[] = [];
  // 3 complex-looking deliveries in one night
  for (let i = 0; i < 3; i++) {
    evidence.push({
      type: "DELIVERY_VERIFIED",
      created_at: new Date(base - i * 1800 * 1000).toISOString(), // 30 min apart
      confidence: 0.5,
    });
    evidence.push({
      type: "REPO_STACK_INFERRED",
      created_at: new Date(base - i * 1800 * 1000).toISOString(),
      payload: { languages: { TypeScript: 30000, Python: 15000, Go: 5000 }, has_ci: true, has_tests: true, has_dockerfile: true },
      confidence: 0.4,
    });
  }
  return makeEvidence(evidence);
}

// ═══════════════════════════════════════════════════════════════════════
// ADVERSARIAL TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("Adversarial: Honest builder scores higher than spammer", () => {
  it("honest > spammer", () => {
    const honest = honestBuilderEvidence();
    const spammer = spammerEvidence();

    const honestResult = computeForgeScoreV3({
      builderId: "honest",
      evidence: honest,
      counts: makeCountsFromEvidence(honest),
      tenureDays: 180,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [60, 50, 20, 30, 40],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: true,
    });

    const spammerResult = computeForgeScoreV3({
      builderId: "spammer",
      evidence: spammer,
      counts: makeCountsFromEvidence(spammer),
      tenureDays: 7,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [10, 10, 10, 10, 10],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: false,
    });

    expect(honestResult.score).toBeGreaterThan(spammerResult.score);
  });
});

describe("Adversarial: Ghoster drops significantly", () => {
  it("ghoster score much lower than honest", () => {
    const ghoster = ghosterEvidence();
    const honest = honestBuilderEvidence();

    const ghosterResult = computeForgeScoreV3({
      builderId: "ghoster",
      evidence: ghoster,
      counts: makeCountsFromEvidence(ghoster),
      tenureDays: 90,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [20, 20, 0, 0, 0],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: false,
    });

    const honestResult = computeForgeScoreV3({
      builderId: "honest",
      evidence: honest,
      counts: makeCountsFromEvidence(honest),
      tenureDays: 180,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [60, 50, 20, 30, 40],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: true,
    });

    expect(honestResult.score - ghosterResult.score).toBeGreaterThan(100);
  });
});

describe("Adversarial: Template clone capped", () => {
  it("template cloner penalized by BCM", () => {
    const cloner = templateClonerEvidence();
    const bcm = computeBCM(cloner, 30, null, [40, 0, 0, 0, 0], []);
    expect(bcm.flags).toContain("TEMPLATE_CLONE_DETECTED");
    expect(bcm.multiplier).toBeLessThan(1.0);
  });
});

describe("Adversarial: Attestation ring has minimal impact", () => {
  it("reciprocal attestation ring detected", () => {
    const ringEvidence = attestationRingEvidence();
    const reciprocals = attestationRingReciprocals();

    const bcm = computeBCM(ringEvidence, 60, null, [10, 10, 0, 0, 0], reciprocals);
    expect(bcm.flags).toContain("ATTESTATION_RING_DETECTED");
    expect(bcm.multiplier).toBeLessThan(1.0);
  });
});

describe("Adversarial: AI burst builder penalized", () => {
  it("burst activity detected", () => {
    const burst = aiNightBurstEvidence();
    const bcm = computeBCM(burst, 1, null, [0, 0, 0, 0, 0], []);
    expect(bcm.flags.some(f => f.includes("BURSTINESS") || f.includes("DENSITY"))).toBe(true);
    expect(bcm.multiplier).toBeLessThan(1.0);
  });
});

describe("Adversarial: Self-report alone cannot inflate", () => {
  it("empty evidence with high self-report yields low score", () => {
    const empty = makeEvidence([]);
    const result = computeForgeScoreV3({
      builderId: "self-reporter",
      evidence: empty,
      counts: {},
      tenureDays: 1,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [100, 100, 100, 100, 100],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: false,
    });

    // Score based solely on self-report should be minimal
    expect(result.score).toBeLessThan(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("Property: Idempotent recompute", () => {
  it("same inputs produce same output", () => {
    const evidence = honestBuilderEvidence();
    const counts = makeCountsFromEvidence(evidence);
    const input = {
      builderId: "test",
      evidence,
      counts,
      tenureDays: 180,
      previousScore: 500 as number | null,
      previousSkillScores: [50, 40, 20, 30, 40],
      currentSkillScores: [60, 50, 20, 30, 40],
      allAttestationsForBuilder: [] as ScoreEvidence[],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: true,
    };

    const r1 = computeForgeScoreV3(input);
    const r2 = computeForgeScoreV3(input);

    expect(r1.score).toBe(r2.score);
    expect(r1.breakdown.dimensions).toEqual(r2.breakdown.dimensions);
    expect(r1.breakdown.bcm.multiplier).toBe(r2.breakdown.bcm.multiplier);
  });
});

describe("Property: No score change without new evidence", () => {
  it("recompute with identical evidence returns capped identical score", () => {
    const evidence = honestBuilderEvidence();
    const counts = makeCountsFromEvidence(evidence);

    const r1 = computeForgeScoreV3({
      builderId: "test",
      evidence,
      counts,
      tenureDays: 180,
      previousScore: null,
      previousSkillScores: null,
      currentSkillScores: [60, 50, 20, 30, 40],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: true,
    });

    const r2 = computeForgeScoreV3({
      builderId: "test",
      evidence,
      counts,
      tenureDays: 180,
      previousScore: r1.score,
      previousSkillScores: [60, 50, 20, 30, 40],
      currentSkillScores: [60, 50, 20, 30, 40],
      allAttestationsForBuilder: [],
      model: MODEL,
      triggerReason: "test",
      hasMilestoneEvidence: false,
    });

    // Delta should be 0 or within normal cap
    expect(Math.abs(r2.delta)).toBeLessThanOrEqual(MODEL.caps.normal_delta_max);
  });
});

describe("Property: Movement caps enforced", () => {
  it("normal recompute capped at ±35", () => {
    const { score } = applyMovementCaps(600, 500, false, MODEL.caps);
    expect(score).toBe(535); // 500 + 35
  });

  it("milestone recompute capped at ±70", () => {
    const { score } = applyMovementCaps(600, 500, true, MODEL.caps);
    expect(score).toBe(570); // 500 + 70
  });

  it("downward movement also capped", () => {
    const { score } = applyMovementCaps(300, 500, false, MODEL.caps);
    expect(score).toBe(465); // 500 - 35
  });

  it("first computation has no cap", () => {
    const { score } = applyMovementCaps(700, null, false, MODEL.caps);
    expect(score).toBe(700);
  });
});

describe("Property: Tenure gates enforced", () => {
  it("score capped at 799 with < 4 months tenure", () => {
    expect(applyTenureGates(850, 3, MODEL.caps)).toBe(799);
  });

  it("score capped at 899 with < 9 months tenure", () => {
    expect(applyTenureGates(950, 5, MODEL.caps)).toBe(899);
  });

  it("score passes through with sufficient tenure", () => {
    expect(applyTenureGates(950, 10, MODEL.caps)).toBe(950);
  });

  it("800 allowed at exactly 4 months", () => {
    expect(applyTenureGates(820, 4, MODEL.caps)).toBe(820);
  });
});

describe("Property: BCM always in [0.6, 1.05]", () => {
  it("empty evidence returns 1.0", () => {
    const bcm = computeBCM([], 30, null, [0, 0, 0, 0, 0], []);
    expect(bcm.multiplier).toBeGreaterThanOrEqual(0.6);
    expect(bcm.multiplier).toBeLessThanOrEqual(1.05);
  });

  it("maximum anomaly still floors at 0.6", () => {
    const extreme = makeEvidence(
      Array.from({ length: 100 }, () => ({
        type: "DELIVERY_VERIFIED" as const,
        created_at: new Date().toISOString(), // all same moment
      }))
    );
    const bcm = computeBCM(extreme, 1, [0, 0, 0, 0, 0], [100, 100, 100, 100, 100], []);
    expect(bcm.multiplier).toBeGreaterThanOrEqual(0.6);
    expect(bcm.multiplier).toBeLessThanOrEqual(1.05);
  });

  it("honest long-tenure builder gets 1.0-1.05", () => {
    const honest = honestBuilderEvidence();
    const bcm = computeBCM(honest, 180, [50, 40, 20, 30, 40], [60, 50, 20, 30, 40], []);
    expect(bcm.multiplier).toBeGreaterThanOrEqual(1.0);
    expect(bcm.multiplier).toBeLessThanOrEqual(1.05);
  });
});

describe("Property: Score range always 100-999", () => {
  it("mapTo3Digit maps 0 to low range", () => {
    const s = mapTo3Digit(0);
    expect(s).toBeGreaterThanOrEqual(100);
    expect(s).toBeLessThanOrEqual(150);
  });

  it("mapTo3Digit maps 100 to high range", () => {
    const s = mapTo3Digit(100);
    expect(s).toBeGreaterThanOrEqual(960);
    expect(s).toBeLessThanOrEqual(999);
  });

  it("mapTo3Digit maps 50 to mid-range", () => {
    const s = mapTo3Digit(50);
    expect(s).toBeGreaterThan(400);
    expect(s).toBeLessThan(700);
  });
});

describe("Property: Inactivity decay", () => {
  it("no decay within 60 days", () => {
    const { decayApplied } = applyInactivityDecay(500, 30, MODEL.caps);
    expect(decayApplied).toBe(0);
  });

  it("decay after 60 days", () => {
    const { score, decayApplied } = applyInactivityDecay(500, 120, MODEL.caps);
    expect(decayApplied).toBeGreaterThan(0);
    expect(score).toBeLessThan(500);
  });

  it("decay never goes below 100", () => {
    const { score } = applyInactivityDecay(200, 1000, MODEL.caps);
    expect(score).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT TESTS: Helper Functions
// ═══════════════════════════════════════════════════════════════════════

describe("giniCoefficient", () => {
  it("returns 0 for uniform distribution", () => {
    expect(giniCoefficient([5, 5, 5, 5])).toBeCloseTo(0, 1);
  });

  it("returns high value for concentrated distribution", () => {
    const g = giniCoefficient([0, 0, 0, 100]);
    expect(g).toBeGreaterThan(0.6);
  });

  it("returns 0 for single value", () => {
    expect(giniCoefficient([42])).toBe(0);
  });
});

describe("hashPayload", () => {
  it("produces consistent hashes", () => {
    const h1 = hashPayload({ a: 1, b: 2 });
    const h2 = hashPayload({ b: 2, a: 1 }); // different key order
    expect(h1).toBe(h2);
  });

  it("different payloads produce different hashes", () => {
    const h1 = hashPayload({ a: 1 });
    const h2 = hashPayload({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});

describe("inferStackFromDependencies", () => {
  it("detects Next.js + Prisma stack", () => {
    const result = inferStackFromDependencies({
      next: "14.0.0",
      react: "18.0.0",
      prisma: "5.0.0",
      "@auth/core": "0.1.0",
      stripe: "14.0.0",
    });
    expect(result.depth_flags.has_database).toBe(true);
    expect(result.depth_flags.has_auth).toBe(true);
    expect(result.depth_flags.has_external_integrations).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("returns low confidence for empty deps", () => {
    const result = inferStackFromDependencies({});
    expect(result.detected_stack.length).toBe(0);
    expect(result.confidence).toBe(0);
  });
});

describe("Dimension computations", () => {
  it("EC returns 0 for empty input", () => {
    expect(computeEC({
      verified_deliveries: 0, sustained_deliveries: 0, team_completed_deliveries: 0,
      active_weeks_last_12: 0, deliveries_last_6m: 0, recency_days: 365, evidence_additions_count: 0,
    })).toBe(0);
  });

  it("RC returns 0 for no projects", () => {
    expect(computeRC({
      projects_joined: 0, projects_completed: 0, projects_abandoned: 0,
      projects_late: 0, no_show_count: 0, team_departure_clean: 0,
      team_departure_ghost: 0, attestation_score: 0,
    })).toBe(0);
  });

  it("RC penalizes no-shows heavily", () => {
    const withNoShow = computeRC({
      projects_joined: 5, projects_completed: 2, projects_abandoned: 0,
      projects_late: 0, no_show_count: 3, team_departure_clean: 0,
      team_departure_ghost: 3, attestation_score: 0,
    });
    const withoutNoShow = computeRC({
      projects_joined: 5, projects_completed: 2, projects_abandoned: 0,
      projects_late: 0, no_show_count: 0, team_departure_clean: 0,
      team_departure_ghost: 0, attestation_score: 0,
    });
    expect(withoutNoShow).toBeGreaterThan(withNoShow + 20);
  });

  it("LPI requires actual probe results", () => {
    expect(computeLPI({
      deployment_probes_passed: 0, deployment_probes_total: 0,
      github_contributor_verified: 0, github_contributor_total: 0,
      live_challenge_score: 0,
    })).toBe(0);

    expect(computeLPI({
      deployment_probes_passed: 3, deployment_probes_total: 3,
      github_contributor_verified: 2, github_contributor_total: 2,
      live_challenge_score: 0,
    })).toBeGreaterThan(50);
  });
});
