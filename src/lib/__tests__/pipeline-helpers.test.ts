import { describe, expect, it } from "vitest";
import { readSkillScores } from "@/lib/scoring/pipeline";

describe("readSkillScores", () => {
  it("returns stored skill scores", () => {
    expect(readSkillScores({ skill_scores: [10, 20, 30, 40, 50] })).toEqual([10, 20, 30, 40, 50]);
  });
  it("returns null for missing or malformed data", () => {
    expect(readSkillScores(null)).toBeNull();
    expect(readSkillScores([1, 2])).toBeNull();
    expect(readSkillScores({ skill_scores: ["a"] })).toBeNull();
    expect(readSkillScores({})).toBeNull();
  });
});
