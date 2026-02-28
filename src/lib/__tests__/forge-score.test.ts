import { describe, it, expect } from "vitest";
import {
  computeForgeScoreV2,
  computeDeliverySuccess,
  computeReliability,
  computeDeliveryQuality,
  computeConsistency,
  computeConfidence,
  getScoreBand,
  getConfidenceLabel,
  getImproveSuggestions,
  type ForgeScoreInput,
  type DeliveryQualityItem,
  type ForgeScoreOutput,
} from "../forge-score";

// ─── DS: Delivery Success ───────────────────────────────────────────────────

describe("computeDeliverySuccess", () => {
  it("returns 0 for no deliveries", () => {
    expect(
      computeDeliverySuccess({
        n_verified_deliveries: 0,
        n_sustained_deliveries: 0,
        n_team_completed_deliveries: 0,
      })
    ).toBe(0);
  });

  it("returns positive value for 1 verified delivery", () => {
    const ds = computeDeliverySuccess({
      n_verified_deliveries: 1,
      n_sustained_deliveries: 0,
      n_team_completed_deliveries: 0,
    });
    expect(ds).toBeGreaterThan(0);
    expect(ds).toBeLessThan(20);
  });

  it("sustained deliveries have 1.5x weight", () => {
    const withoutSustained = computeDeliverySuccess({
      n_verified_deliveries: 3,
      n_sustained_deliveries: 0,
      n_team_completed_deliveries: 0,
    });
    const withSustained = computeDeliverySuccess({
      n_verified_deliveries: 3,
      n_sustained_deliveries: 2,
      n_team_completed_deliveries: 0,
    });
    expect(withSustained).toBeGreaterThan(withoutSustained);
  });

  it("has diminishing returns (20 deliveries not 4x of 5)", () => {
    const five = computeDeliverySuccess({
      n_verified_deliveries: 5,
      n_sustained_deliveries: 0,
      n_team_completed_deliveries: 0,
    });
    const twenty = computeDeliverySuccess({
      n_verified_deliveries: 20,
      n_sustained_deliveries: 0,
      n_team_completed_deliveries: 0,
    });
    expect(twenty).toBeLessThan(five * 4);
  });

  it("caps at 100", () => {
    const ds = computeDeliverySuccess({
      n_verified_deliveries: 100,
      n_sustained_deliveries: 100,
      n_team_completed_deliveries: 100,
    });
    expect(ds).toBeLessThanOrEqual(100);
  });
});

// ─── R: Reliability ─────────────────────────────────────────────────────────

describe("computeReliability", () => {
  it("returns 0 for no projects", () => {
    expect(
      computeReliability({
        projects_joined: 0,
        projects_completed: 0,
        projects_abandoned: 0,
        projects_late: 0,
        projects_no_show: 0,
      })
    ).toBe(0);
  });

  it("returns high score for perfect record", () => {
    const r = computeReliability({
      projects_joined: 5,
      projects_completed: 5,
      projects_abandoned: 0,
      projects_late: 0,
      projects_no_show: 0,
    });
    expect(r).toBeGreaterThan(80);
  });

  it("punishes abandonment heavily", () => {
    const clean = computeReliability({
      projects_joined: 5,
      projects_completed: 4,
      projects_abandoned: 0,
      projects_late: 0,
      projects_no_show: 0,
    });
    const abandoned = computeReliability({
      projects_joined: 5,
      projects_completed: 4,
      projects_abandoned: 2,
      projects_late: 0,
      projects_no_show: 0,
    });
    expect(abandoned).toBeLessThan(clean);
  });

  it("no_show has highest penalty", () => {
    const withAbandoned = computeReliability({
      projects_joined: 5,
      projects_completed: 3,
      projects_abandoned: 1,
      projects_late: 0,
      projects_no_show: 0,
    });
    const withNoShow = computeReliability({
      projects_joined: 5,
      projects_completed: 3,
      projects_abandoned: 0,
      projects_late: 0,
      projects_no_show: 1,
    });
    expect(withNoShow).toBeLessThan(withAbandoned);
  });

  it("bayesian prior stabilizes small samples", () => {
    const oneOfOne = computeReliability({
      projects_joined: 1,
      projects_completed: 1,
      projects_abandoned: 0,
      projects_late: 0,
      projects_no_show: 0,
    });
    // (1+2)/(1+3) = 0.75 → not 100 for 1/1
    expect(oneOfOne).toBeLessThan(80);
  });
});

// ─── DQ: Delivery Quality ───────────────────────────────────────────────────

describe("computeDeliveryQuality", () => {
  it("returns 0 for no deliveries", () => {
    expect(computeDeliveryQuality({ deliveries: [] })).toBe(0);
  });

  it("returns positive for a verified delivery with signals", () => {
    const item: DeliveryQualityItem = {
      verification_signals: {
        deploy_reachable: true,
        repo_exists: true,
        contribution_evidence: null,
        timeline_evidence: null,
        collaborator_attestation: null,
      },
      depth_flags: {
        has_auth: true,
        has_database: true,
        has_api: true,
        has_external_integrations: false,
        has_payments: false,
        has_background_jobs: false,
      },
      sustained_90_days: true,
      verified: true,
      ownership_signals: {
        deployment_owner_verified: true,
        domain_owner_verified: null,
        primary_operator_likely: true,
      },
      update_windows_24h_count: 10,
    };
    const dq = computeDeliveryQuality({ deliveries: [item] });
    expect(dq).toBeGreaterThan(0);
  });

  it("rewards deeper systems", () => {
    const shallow: DeliveryQualityItem = {
      verification_signals: {
        deploy_reachable: true,
        repo_exists: true,
        contribution_evidence: null,
        timeline_evidence: null,
        collaborator_attestation: null,
      },
      depth_flags: {
        has_auth: false,
        has_database: false,
        has_api: false,
        has_external_integrations: false,
        has_payments: false,
        has_background_jobs: false,
      },
      sustained_90_days: false,
      verified: true,
      ownership_signals: {
        deployment_owner_verified: null,
        domain_owner_verified: null,
        primary_operator_likely: null,
      },
      update_windows_24h_count: 0,
    };
    const deep: DeliveryQualityItem = {
      ...shallow,
      depth_flags: {
        has_auth: true,
        has_database: true,
        has_api: true,
        has_external_integrations: true,
        has_payments: true,
        has_background_jobs: true,
      },
      sustained_90_days: true,
      update_windows_24h_count: 15,
    };
    const dqShallow = computeDeliveryQuality({ deliveries: [shallow] });
    const dqDeep = computeDeliveryQuality({ deliveries: [deep] });
    expect(dqDeep).toBeGreaterThan(dqShallow);
  });
});

// ─── K: Consistency ─────────────────────────────────────────────────────────

describe("computeConsistency", () => {
  it("returns 0 for fully inactive builder", () => {
    expect(
      computeConsistency({
        active_weeks_last_12: 0,
        deliveries_last_6m: 0,
        recency_days: 365,
      })
    ).toBeLessThan(10);
  });

  it("rewards recent activity", () => {
    const recent = computeConsistency({
      active_weeks_last_12: 6,
      deliveries_last_6m: 3,
      recency_days: 1,
    });
    const stale = computeConsistency({
      active_weeks_last_12: 6,
      deliveries_last_6m: 3,
      recency_days: 180,
    });
    expect(recent).toBeGreaterThan(stale);
  });

  it("rewards steady cadence", () => {
    const steady = computeConsistency({
      active_weeks_last_12: 12,
      deliveries_last_6m: 6,
      recency_days: 0,
    });
    expect(steady).toBeGreaterThan(70);
  });
});

// ─── CONF: Confidence ───────────────────────────────────────────────────────

describe("computeConfidence", () => {
  it("returns 0 for no data", () => {
    expect(
      computeConfidence({
        n_verified_deliveries: 0,
        n_sustained_deliveries: 0,
        n_distinct_collaborators: 0,
        n_outcomes: 0,
      })
    ).toBe(0);
  });

  it("grows with more data points", () => {
    const low = computeConfidence({
      n_verified_deliveries: 1,
      n_sustained_deliveries: 0,
      n_distinct_collaborators: 0,
      n_outcomes: 0,
    });
    const high = computeConfidence({
      n_verified_deliveries: 10,
      n_sustained_deliveries: 5,
      n_distinct_collaborators: 8,
      n_outcomes: 6,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(80);
  });
});

// ─── Full Score ─────────────────────────────────────────────────────────────

describe("computeForgeScoreV2", () => {
  const baseInput: ForgeScoreInput = {
    delivery: {
      n_verified_deliveries: 0,
      n_sustained_deliveries: 0,
      n_team_completed_deliveries: 0,
    },
    reliability: {
      projects_joined: 0,
      projects_completed: 0,
      projects_abandoned: 0,
      projects_late: 0,
      projects_no_show: 0,
    },
    quality: { deliveries: [] },
    consistency: {
      active_weeks_last_12: 0,
      deliveries_last_6m: 0,
      recency_days: 365,
    },
    confidence: {
      n_verified_deliveries: 0,
      n_sustained_deliveries: 0,
      n_distinct_collaborators: 0,
      n_outcomes: 0,
    },
  };

  it("returns 0 for empty builder", () => {
    const result = computeForgeScoreV2(baseInput);
    expect(result.forge_score).toBe(0);
  });

  it("returns score between 0 and 1000", () => {
    const result = computeForgeScoreV2({
      ...baseInput,
      delivery: {
        n_verified_deliveries: 5,
        n_sustained_deliveries: 2,
        n_team_completed_deliveries: 1,
      },
      reliability: {
        projects_joined: 4,
        projects_completed: 3,
        projects_abandoned: 0,
        projects_late: 0,
        projects_no_show: 0,
      },
      consistency: {
        active_weeks_last_12: 8,
        deliveries_last_6m: 3,
        recency_days: 5,
      },
      confidence: {
        n_verified_deliveries: 5,
        n_sustained_deliveries: 2,
        n_distinct_collaborators: 4,
        n_outcomes: 3,
      },
    });
    expect(result.forge_score).toBeGreaterThanOrEqual(0);
    expect(result.forge_score).toBeLessThanOrEqual(1000);
    expect(result.forge_score).toBeGreaterThan(100);
  });

  it("confidence multiplier reduces low-confidence scores", () => {
    const highConf = computeForgeScoreV2({
      ...baseInput,
      delivery: { n_verified_deliveries: 5, n_sustained_deliveries: 3, n_team_completed_deliveries: 2 },
      reliability: { projects_joined: 5, projects_completed: 5, projects_abandoned: 0, projects_late: 0, projects_no_show: 0 },
      consistency: { active_weeks_last_12: 10, deliveries_last_6m: 4, recency_days: 1 },
      confidence: { n_verified_deliveries: 10, n_sustained_deliveries: 5, n_distinct_collaborators: 8, n_outcomes: 6 },
    });
    const lowConf = computeForgeScoreV2({
      ...baseInput,
      delivery: { n_verified_deliveries: 5, n_sustained_deliveries: 3, n_team_completed_deliveries: 2 },
      reliability: { projects_joined: 5, projects_completed: 5, projects_abandoned: 0, projects_late: 0, projects_no_show: 0 },
      consistency: { active_weeks_last_12: 10, deliveries_last_6m: 4, recency_days: 1 },
      confidence: { n_verified_deliveries: 1, n_sustained_deliveries: 0, n_distinct_collaborators: 0, n_outcomes: 0 },
    });
    expect(highConf.forge_score).toBeGreaterThan(lowConf.forge_score);
  });
});

// ─── Score Bands ────────────────────────────────────────────────────────────

describe("getScoreBand", () => {
  it("maps score ranges correctly", () => {
    expect(getScoreBand(0)).toBe("New");
    expect(getScoreBand(199)).toBe("New");
    expect(getScoreBand(200)).toBe("Developing");
    expect(getScoreBand(399)).toBe("Developing");
    expect(getScoreBand(400)).toBe("Proven");
    expect(getScoreBand(599)).toBe("Proven");
    expect(getScoreBand(600)).toBe("Strong");
    expect(getScoreBand(799)).toBe("Strong");
    expect(getScoreBand(800)).toBe("Elite");
    expect(getScoreBand(1000)).toBe("Elite");
  });
});

// ─── Confidence Labels ──────────────────────────────────────────────────────

describe("getConfidenceLabel", () => {
  it("maps confidence ranges correctly", () => {
    expect(getConfidenceLabel(0)).toBe("Low");
    expect(getConfidenceLabel(34)).toBe("Low");
    expect(getConfidenceLabel(35)).toBe("Medium");
    expect(getConfidenceLabel(64)).toBe("Medium");
    expect(getConfidenceLabel(65)).toBe("High");
    expect(getConfidenceLabel(100)).toBe("High");
  });
});

// ─── Improvement Suggestions ────────────────────────────────────────────────

describe("getImproveSuggestions", () => {
  it("suggests improvements for lowest scores", () => {
    const output: ForgeScoreOutput = {
      forge_score: 200,
      confidence_score: 30,
      delivery_success_score: 80,
      reliability_score: 10,
      delivery_quality_score: 5,
      consistency_score: 50,
    };
    const suggestions = getImproveSuggestions(output);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.includes("abandon") || s.includes("Complete") || s.includes("Deliver"))).toBe(true);
  });

  it("returns encouraging message for strong scores", () => {
    const output: ForgeScoreOutput = {
      forge_score: 800,
      confidence_score: 90,
      delivery_success_score: 85,
      reliability_score: 90,
      delivery_quality_score: 80,
      consistency_score: 75,
    };
    const suggestions = getImproveSuggestions(output);
    expect(suggestions.some((s) => s.includes("strong"))).toBe(true);
  });
});
