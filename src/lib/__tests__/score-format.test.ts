import { describe, it, expect } from "vitest";
import {
  formatScore,
  formatScoreCompact,
  formatBarValue,
  formatConfidence,
  formatBand,
  isScoreComputed,
  formatStatValue,
  safeSkillValue,
} from "@/lib/score/format";

describe("formatScore", () => {
  it("returns — for null", () => {
    expect(formatScore(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatScore(undefined)).toBe("—");
  });

  it("returns — for 0", () => {
    expect(formatScore(0)).toBe("—");
  });

  it("returns — for negative", () => {
    expect(formatScore(-5)).toBe("—");
  });

  it("returns string for positive score", () => {
    expect(formatScore(742)).toBe("742");
  });
});

describe("formatScoreCompact", () => {
  it("returns — and hasValue false for 0", () => {
    const result = formatScoreCompact(0);
    expect(result.display).toBe("—");
    expect(result.hasValue).toBe(false);
  });

  it("returns value and hasValue true for positive", () => {
    const result = formatScoreCompact(500);
    expect(result.display).toBe("500");
    expect(result.hasValue).toBe(true);
  });
});

describe("formatBarValue", () => {
  it("returns — for 0", () => {
    expect(formatBarValue(0)).toBe("—");
  });

  it("returns — for null", () => {
    expect(formatBarValue(null)).toBe("—");
  });

  it("returns string for positive", () => {
    expect(formatBarValue(65)).toBe("65");
  });
});

describe("formatConfidence", () => {
  it("returns — for null", () => {
    expect(formatConfidence(null)).toBe("—");
  });

  it("returns — for 0", () => {
    expect(formatConfidence(0)).toBe("—");
  });

  it("returns Low for low values", () => {
    expect(formatConfidence(20)).toBe("Low");
  });

  it("returns Medium for mid values", () => {
    expect(formatConfidence(50)).toBe("Medium");
  });

  it("returns High for high values", () => {
    expect(formatConfidence(80)).toBe("High");
  });
});

describe("formatBand", () => {
  it("returns null for null score", () => {
    expect(formatBand(null)).toBeNull();
  });

  it("returns null for 0 (no New band)", () => {
    expect(formatBand(0)).toBeNull();
  });

  it("returns null for very low scores below 200", () => {
    expect(formatBand(100)).toBeNull();
  });

  it("returns Developing for 200+", () => {
    expect(formatBand(250)).toBe("Developing");
  });

  it("returns Proven for 400+", () => {
    expect(formatBand(500)).toBe("Proven");
  });

  it("returns Strong for 600+", () => {
    expect(formatBand(700)).toBe("Strong");
  });

  it("returns Elite for 800+", () => {
    expect(formatBand(900)).toBe("Elite");
  });
});

describe("isScoreComputed", () => {
  it("returns false for null", () => {
    expect(isScoreComputed(null)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isScoreComputed(0)).toBe(false);
  });

  it("returns true for positive", () => {
    expect(isScoreComputed(1)).toBe(true);
  });
});

describe("formatStatValue", () => {
  it("returns — for null", () => {
    expect(formatStatValue(null)).toBe("—");
  });

  it("returns number as string", () => {
    expect(formatStatValue(42)).toBe("42");
  });

  it("appends suffix", () => {
    expect(formatStatValue(92, "%")).toBe("92%");
  });
});

describe("safeSkillValue", () => {
  it("returns 0 for null", () => {
    expect(safeSkillValue(null)).toBe(0);
  });

  it("returns 0 for negative", () => {
    expect(safeSkillValue(-5)).toBe(0);
  });

  it("returns 0 for 0", () => {
    expect(safeSkillValue(0)).toBe(0);
  });

  it("returns value for positive", () => {
    expect(safeSkillValue(45)).toBe(45);
  });
});
