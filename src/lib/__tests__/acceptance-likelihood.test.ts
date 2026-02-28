import { describe, it, expect } from "vitest";
import {
  computeAcceptanceLikelihood,
  type AcceptanceInput,
} from "../matching/acceptance-likelihood";

function makeInput(overrides: Partial<AcceptanceInput> = {}): AcceptanceInput {
  return {
    builder: {
      availability: "available",
      forge_score: 500,
      confidence_score: 50,
      reliability_score: 60,
    },
    project: {
      owner_forge_score: 600,
      stage: "mvp",
      hours_per_week: 20,
      team_size: 3,
      roles_needed: ["Backend"],
    },
    history: {
      past_invites_received: 5,
      past_invites_accepted: 3,
      past_invites_declined: 2,
      recent_invites_7d: 1,
    },
    compatibilityPercent: 70,
    ...overrides,
  };
}

describe("computeAcceptanceLikelihood", () => {
  it("returns percent between 5 and 95", () => {
    const result = computeAcceptanceLikelihood(makeInput());
    expect(result.percent).toBeGreaterThanOrEqual(5);
    expect(result.percent).toBeLessThanOrEqual(95);
  });

  it("returns valid confidence", () => {
    const result = computeAcceptanceLikelihood(makeInput());
    expect(["High", "Medium", "Low"]).toContain(result.confidence);
  });

  it("returns 1-3 reasons", () => {
    const result = computeAcceptanceLikelihood(makeInput());
    expect(result.reasons.length).toBeGreaterThanOrEqual(1);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
  });

  it("available builder has higher acceptance than busy", () => {
    const available = computeAcceptanceLikelihood(
      makeInput({ builder: { availability: "available", forge_score: 500, confidence_score: 50, reliability_score: 60 } })
    );
    const busy = computeAcceptanceLikelihood(
      makeInput({ builder: { availability: "busy", forge_score: 500, confidence_score: 50, reliability_score: 60 } })
    );
    expect(available.percent).toBeGreaterThan(busy.percent);
  });

  it("high compatibility increases acceptance", () => {
    const high = computeAcceptanceLikelihood(makeInput({ compatibilityPercent: 90 }));
    const low = computeAcceptanceLikelihood(makeInput({ compatibilityPercent: 20 }));
    expect(high.percent).toBeGreaterThan(low.percent);
  });

  it("too many recent invites penalizes", () => {
    const normal = computeAcceptanceLikelihood(makeInput({
      history: { past_invites_received: 5, past_invites_accepted: 3, past_invites_declined: 2, recent_invites_7d: 1 },
    }));
    const spammed = computeAcceptanceLikelihood(makeInput({
      history: { past_invites_received: 15, past_invites_accepted: 3, past_invites_declined: 2, recent_invites_7d: 8 },
    }));
    expect(normal.percent).toBeGreaterThan(spammed.percent);
  });

  it("high confidence when many past invites", () => {
    const result = computeAcceptanceLikelihood(makeInput({
      history: { past_invites_received: 10, past_invites_accepted: 7, past_invites_declined: 3, recent_invites_7d: 1 },
    }));
    expect(result.confidence).toBe("High");
  });

  it("low confidence when no history", () => {
    const result = computeAcceptanceLikelihood(makeInput({
      history: { past_invites_received: 0, past_invites_accepted: 0, past_invites_declined: 0, recent_invites_7d: 0 },
    }));
    expect(result.confidence).toBe("Low");
  });
});
