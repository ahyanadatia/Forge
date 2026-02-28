import { describe, it, expect } from "vitest";
import {
  interpretDimension,
  getEvidenceCoverage,
  getScoreState,
  getTopStrengths,
  getImprovementSuggestions,
} from "@/lib/score/interpretation";

describe("interpretDimension", () => {
  it("returns insufficient for null value", () => {
    const result = interpretDimension(null, "Backend");
    expect(result.hasEvidence).toBe(false);
    expect(result.displayValue).toBe("—");
    expect(result.level).toBe("insufficient");
  });

  it("returns insufficient for 0", () => {
    const result = interpretDimension(0, "Frontend");
    expect(result.hasEvidence).toBe(false);
    expect(result.displayValue).toBe("—");
  });

  it("returns low for small values", () => {
    const result = interpretDimension(15, "ML");
    expect(result.hasEvidence).toBe(true);
    expect(result.displayValue).toBe("15");
    expect(result.level).toBe("low");
  });

  it("returns medium for mid-range", () => {
    const result = interpretDimension(45, "Systems");
    expect(result.level).toBe("medium");
  });

  it("returns high for 60+", () => {
    const result = interpretDimension(75, "DevOps");
    expect(result.level).toBe("high");
  });
});

describe("getEvidenceCoverage", () => {
  it("returns None when all values are null/0", () => {
    expect(getEvidenceCoverage({ a: 0, b: null, c: undefined })).toBe("None");
  });

  it("returns Low when < 40% have data", () => {
    expect(getEvidenceCoverage({ a: 10, b: 0, c: 0, d: 0, e: 0 })).toBe("Low");
  });

  it("returns Medium when 40-80% have data", () => {
    expect(getEvidenceCoverage({ a: 10, b: 20, c: 30, d: 0, e: 0 })).toBe("Medium");
  });

  it("returns High when 80%+ have data", () => {
    expect(getEvidenceCoverage({ a: 10, b: 20, c: 30, d: 40, e: 50 })).toBe("High");
  });
});

describe("getScoreState", () => {
  it("returns none when both are 0", () => {
    expect(getScoreState(0, 0)).toBe("none");
  });

  it("returns partial when confidence is low", () => {
    expect(getScoreState(200, 20)).toBe("partial");
  });

  it("returns full when confidence is adequate", () => {
    expect(getScoreState(500, 50)).toBe("full");
  });
});

describe("getTopStrengths", () => {
  it("returns top 2 by value", () => {
    const dims = [
      { key: "backend", label: "Backend", value: 80 },
      { key: "frontend", label: "Frontend", value: 50 },
      { key: "ml", label: "ML", value: 90 },
      { key: "systems", label: "Systems", value: 10 },
      { key: "devops", label: "DevOps", value: 0 },
    ];
    const strengths = getTopStrengths(dims);
    expect(strengths).toHaveLength(2);
    expect(strengths[0].dimension).toBe("ML");
    expect(strengths[1].dimension).toBe("Backend");
  });

  it("excludes 0 values", () => {
    const dims = [
      { key: "backend", label: "Backend", value: 0 },
      { key: "frontend", label: "Frontend", value: 0 },
      { key: "ml", label: "ML", value: 30 },
    ];
    const strengths = getTopStrengths(dims);
    expect(strengths).toHaveLength(1);
  });

  it("returns empty for all-zero", () => {
    const dims = [
      { key: "backend", label: "Backend", value: 0 },
      { key: "frontend", label: "Frontend", value: 0 },
    ];
    expect(getTopStrengths(dims)).toHaveLength(0);
  });
});

describe("getImprovementSuggestions", () => {
  it("suggests deliveries when none exist", () => {
    const suggestions = getImprovementSuggestions(
      { backend: 0, frontend: 0 },
      { deliverySuccess: 0, reliability: 0, quality: 0, consistency: 0 },
      false,
      false
    );
    expect(suggestions.some((s) => s.includes("delivery"))).toBe(true);
  });

  it("suggests GitHub when not connected", () => {
    const suggestions = getImprovementSuggestions(
      { backend: 50, frontend: 50 },
      { deliverySuccess: 50, reliability: 50, quality: 50, consistency: 50 },
      true,
      false
    );
    expect(suggestions.some((s) => s.includes("GitHub"))).toBe(true);
  });

  it("returns positive message for strong profiles", () => {
    const suggestions = getImprovementSuggestions(
      { backend: 80, frontend: 80 },
      { deliverySuccess: 80, reliability: 80, quality: 80, consistency: 80 },
      true,
      true
    );
    expect(suggestions.some((s) => s.includes("strong"))).toBe(true);
  });

  it("returns at most 3 suggestions", () => {
    const suggestions = getImprovementSuggestions(
      { backend: 0, frontend: 0 },
      { deliverySuccess: 10, reliability: 10, quality: 10, consistency: 10 },
      false,
      false
    );
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("tour step definitions", () => {
  it("has 4 steps", async () => {
    const { TOUR_STEPS } = await import("@/lib/onboarding/tour-steps");
    expect(TOUR_STEPS).toHaveLength(4);
  });

  it("each step has required fields", async () => {
    const { TOUR_STEPS } = await import("@/lib/onboarding/tour-steps");
    for (const step of TOUR_STEPS) {
      expect(step.id).toBeDefined();
      expect(step.title).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.selector).toBeDefined();
    }
  });

  it("last step action is done", async () => {
    const { TOUR_STEPS } = await import("@/lib/onboarding/tour-steps");
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(last.ctaAction).toBe("done");
  });
});
