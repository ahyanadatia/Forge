/**
 * Property-based tests for the V3 scoring engine.
 *
 * The example-based tests pin specific scores. These check the invariants the
 * engine promises for any input: scores stay in range, the guard rails hold,
 * and more verified work never lowers a score.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  computeEC,
  computeAOI,
  computeRC,
  computeLPI,
  mapTo3Digit,
  applyTenureGates,
  applyMovementCaps,
  applyInactivityDecay,
} from "../scoring/engine";
import { computeBCM, giniCoefficient } from "../scoring/anti-gaming";
import type {
  ECInput,
  AOIInput,
  RCInput,
  LPIInput,
  ModelCaps,
  ScoreEvidence,
} from "../scoring/types";

const CAPS: ModelCaps = {
  normal_delta_max: 35,
  milestone_delta_max: 70,
  tier_800_min_months: 4,
  tier_900_min_months: 9,
  inactivity_decay_start_days: 60,
  inactivity_decay_rate_per_day: 0.15,
  bcm_min: 0.6,
  bcm_max: 1.05,
};

const count = fc.integer({ min: 0, max: 500 });
const unit = fc.double({ min: 0, max: 1, noNaN: true });
const score = fc.integer({ min: 100, max: 999 });

const ecInput: fc.Arbitrary<ECInput> = fc.record({
  verified_deliveries: count,
  sustained_deliveries: count,
  team_completed_deliveries: count,
  active_weeks_last_12: fc.integer({ min: 0, max: 12 }),
  deliveries_last_6m: count,
  recency_days: fc.integer({ min: 0, max: 2000 }),
  evidence_additions_count: count,
});

const aoiInput: fc.Arbitrary<AOIInput> = fc.record({
  stack_depth_score: unit,
  ownership_strong_count: count,
  repo_complexity_signals: count,
  arch_decision_logs: count,
  pr_review_count: count,
});

const rcInput: fc.Arbitrary<RCInput> = fc.record({
  projects_joined: count,
  projects_completed: count,
  projects_abandoned: count,
  projects_late: count,
  no_show_count: count,
  team_departure_clean: count,
  team_departure_ghost: count,
  attestation_score: unit,
});

const lpiInput: fc.Arbitrary<LPIInput> = fc.record({
  deployment_probes_passed: count,
  deployment_probes_total: count,
  github_contributor_verified: count,
  github_contributor_total: count,
  live_challenge_score: unit,
});

function isDimensionScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

describe("dimension scores", () => {
  it("are whole numbers between 0 and 100 for any input", () => {
    fc.assert(fc.property(ecInput, (i) => isDimensionScore(computeEC(i))));
    fc.assert(fc.property(aoiInput, (i) => isDimensionScore(computeAOI(i))));
    fc.assert(fc.property(rcInput, (i) => isDimensionScore(computeRC(i))));
    fc.assert(fc.property(lpiInput, (i) => isDimensionScore(computeLPI(i))));
  });

  it("execution consistency never falls when a verified delivery is added", () => {
    fc.assert(
      fc.property(ecInput, (i) => {
        const more = { ...i, verified_deliveries: i.verified_deliveries + 1 };
        return computeEC(more) >= computeEC(i);
      })
    );
  });
});

describe("mapTo3Digit", () => {
  it("stays in 100-999 for any composite, including out-of-range ones", () => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (c) => {
        const s = mapTo3Digit(c);
        return Number.isInteger(s) && s >= 100 && s <= 999;
      })
    );
  });

  it("never decreases as the composite rises", () => {
    fc.assert(
      fc.property(unit, unit, (a, b) => {
        const lo = Math.min(a, b) * 100;
        const hi = Math.max(a, b) * 100;
        return mapTo3Digit(hi) >= mapTo3Digit(lo);
      })
    );
  });
});

describe("guard rails", () => {
  it("movement caps bound the change from the previous score", () => {
    fc.assert(
      fc.property(score, score, fc.boolean(), (next, prev, milestone) => {
        const { score: capped } = applyMovementCaps(next, prev, milestone, CAPS);
        const limit = milestone ? CAPS.milestone_delta_max : CAPS.normal_delta_max;
        return Math.abs(capped - prev) <= limit;
      })
    );
  });

  it("a first score is not capped", () => {
    fc.assert(
      fc.property(score, fc.boolean(), (next, milestone) => {
        return applyMovementCaps(next, null, milestone, CAPS).score === next;
      })
    );
  });

  it("tenure gates never raise a score and hold the tier ceilings", () => {
    fc.assert(
      fc.property(score, fc.double({ min: 0, max: 36, noNaN: true }), (s, months) => {
        const gated = applyTenureGates(s, months, CAPS);
        if (gated > s) return false;
        if (months < CAPS.tier_800_min_months && gated >= 800) return false;
        if (months < CAPS.tier_900_min_months && gated >= 900) return false;
        return true;
      })
    );
  });

  it("inactivity decay never raises a score or takes it below 100", () => {
    fc.assert(
      fc.property(score, fc.integer({ min: 0, max: 5000 }), (s, days) => {
        const { score: decayed, decayApplied } = applyInactivityDecay(s, days, CAPS);
        if (days <= CAPS.inactivity_decay_start_days) {
          return decayed === s && decayApplied === 0;
        }
        return decayed <= s && decayed >= 100;
      })
    );
  });
});

describe("anti-gaming", () => {
  it("the Gini coefficient is 0 for uniform activity and stays within 0-1", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 1000 }), { maxLength: 60 }), (xs) => {
        const g = giniCoefficient(xs);
        return g >= 0 && g <= 1;
      })
    );
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 2, max: 40 }), (v, n) => {
        return giniCoefficient(Array(n).fill(v)) === 0;
      })
    );
  });

  it("the multiplier stays within its documented 0.6-1.05 range for any evidence", () => {
    const types = [
      "DELIVERY_VERIFIED",
      "TEAM_ATTESTATION",
      "DEPLOYMENT_HTTP_PROBE_OK",
      "PROJECT_COMPLETED",
      "REPO_STACK_INFERRED",
    ] as const;
    const builders = ["a", "b", "c"];
    const now = Date.UTC(2026, 0, 1);
    const evidenceItem: fc.Arbitrary<ScoreEvidence> = fc
      .record({
        type: fc.constantFrom(...types),
        builder: fc.constantFrom(...builders),
        attester: fc.constantFrom(...builders),
        daysAgo: fc.integer({ min: 0, max: 400 }),
        repo: fc.constantFrom("r1", "r2", "r3"),
      })
      .map((r) => ({
        id: `e-${r.type}-${r.daysAgo}`,
        builder_id: r.builder,
        project_id: null,
        delivery_id: null,
        type: r.type,
        source: "system" as ScoreEvidence["source"],
        payload: { attester_id: r.attester, repo: r.repo },
        confidence: 1,
        hash: "h",
        superseded_by: null,
        created_at: new Date(now - r.daysAgo * 86_400_000).toISOString(),
      }));

    fc.assert(
      fc.property(
        fc.array(evidenceItem, { maxLength: 40 }),
        fc.integer({ min: 0, max: 1500 }),
        fc.option(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 5, maxLength: 5 }), {
          nil: null,
        }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 5, maxLength: 5 }),
        fc.array(evidenceItem, { maxLength: 20 }),
        (evidence, tenureDays, prevSkills, currentSkills, attestations) => {
          const { multiplier } = computeBCM(
            evidence,
            tenureDays,
            prevSkills,
            currentSkills,
            attestations
          );
          return multiplier >= 0.6 && multiplier <= 1.05;
        }
      )
    );
  });
});
