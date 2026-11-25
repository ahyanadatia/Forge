import { describe, it, expect } from "vitest";
import { toV3View, toHistorySeries, nextBandFor, focusDimension, describeAnomaly } from "@/lib/score/v3-view";

const row = {
  score_v3: 512,
  delta: 18,
  model_version: "v3.0",
  computed_at: "2026-11-20T10:00:00Z",
  anomaly_flags: ["MODERATE_BURSTINESS"],
  breakdown: {
    dimensions: { ec: 62.4, rc: 71, aoi: 40, lpi: 88 },
    composite: 64,
    bcm: { multiplier: 0.95, flags: ["MODERATE_BURSTINESS"], details: {} },
    confidence: 58,
    tenure_months: 5,
  },
};

describe("toV3View", () => {
  it("maps a full history row", () => {
    const v = toV3View(row)!;
    expect(v.score).toBe(512);
    expect(v.band).toBe("Proven");
    expect(v.confidenceLabel).toBe("Medium");
    expect(v.dimensions.map((d) => [d.key, d.value])).toEqual([
      ["ec", 62],
      ["rc", 71],
      ["aoi", 40],
      ["lpi", 88],
    ]);
    expect(v.multiplier).toBe(0.95);
    expect(v.nextBand).toEqual({ band: "Strong", pointsAway: 88 });
    expect(v.anomalyFlags).toEqual(["MODERATE_BURSTINESS"]);
  });

  it("returns null without a valid score", () => {
    expect(toV3View(null)).toBeNull();
    expect(toV3View({ score_v3: null })).toBeNull();
    expect(toV3View({ score_v3: 50 })).toBeNull();
    expect(toV3View({ score_v3: "abc" })).toBeNull();
  });

  it("tolerates a missing or malformed breakdown", () => {
    const v = toV3View({ score_v3: 300, breakdown: "nonsense", anomaly_flags: [1, "", "X"] })!;
    expect(v.dimensions.every((d) => d.value === 0)).toBe(true);
    expect(v.confidence).toBe(0);
    expect(v.anomalyFlags).toEqual(["X"]);
    expect(v.modelVersion).toBeNull();
  });

  it("clamps out-of-range dimension values", () => {
    const v = toV3View({ score_v3: 700, breakdown: { dimensions: { ec: 140, rc: -5 } } })!;
    expect(v.dimensions.find((d) => d.key === "ec")!.value).toBe(100);
    expect(v.dimensions.find((d) => d.key === "rc")!.value).toBe(0);
  });

  it("uses model weights when given", () => {
    const v = toV3View(row, { ec: 0.4 })!;
    expect(v.dimensions.find((d) => d.key === "ec")!.weight).toBe(0.4);
    expect(v.dimensions.find((d) => d.key === "lpi")!.weight).toBe(0.2);
  });
});

describe("helpers", () => {
  it("finds the next band", () => {
    expect(nextBandFor(100)).toEqual({ band: "Developing", pointsAway: 100 });
    expect(nextBandFor(799)).toEqual({ band: "Elite", pointsAway: 1 });
    expect(nextBandFor(850)).toBeNull();
  });

  it("orders history oldest first and drops bad rows", () => {
    const s = toHistorySeries([
      { score_v3: 420, computed_at: "2026-11-02T00:00:00Z" },
      { score_v3: 400, computed_at: "2026-10-01T00:00:00Z" },
      { score_v3: 2000, computed_at: "2026-10-05T00:00:00Z" },
      { score_v3: 410, computed_at: null },
    ]);
    expect(s.map((p) => p.score)).toEqual([400, 420]);
  });

  it("points at the weakest dimension", () => {
    expect(focusDimension(toV3View(row)!).key).toBe("aoi");
  });

  it("describes anomaly flags in plain English", () => {
    expect(describeAnomaly("HIGH_BURSTINESS")).toMatch(/burst/);
    expect(describeAnomaly("NEW_FLAG")).toBe("new flag");
  });
});
