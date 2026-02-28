import { describe, it, expect } from "vitest";
import {
  computeFinalSkills,
  getConfidenceLevel,
  hasAiSkills,
  selfToLegacySkills,
  finalToLegacySkills,
} from "../skills";
import type { Builder } from "@/types";

function makeBuilder(overrides: Partial<Builder> = {}): Builder {
  return {
    id: "1",
    email: "test@test.com",
    full_name: "Test User",
    first_name: "Test",
    middle_names: null,
    last_name: "User",
    display_name: null,
    avatar_url: null,
    github_username: "testuser",
    role_descriptor: null,
    location: null,
    bio: null,
    availability: "available",
    skills: { backend: 0, frontend: 0, ml: 0, systems_design: 0, devops: 0 },
    university_or_company: null,
    primary_stack: null,
    secondary_stack: null,
    commitment_preferences: null,
    website_url: null,
    linkedin_url: null,
    self_backend: 80,
    self_frontend: 60,
    self_ml: 20,
    self_systems: 40,
    self_devops: 50,
    ai_backend: null,
    ai_frontend: null,
    ai_ml: null,
    ai_systems: null,
    ai_devops: null,
    skill_confidence: 0,
    skills_last_analyzed: null,
    skill_evidence: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("computeFinalSkills", () => {
  it("returns self scores when AI is absent", () => {
    const b = makeBuilder();
    const result = computeFinalSkills(b);
    expect(result.backend).toBe(80);
    expect(result.frontend).toBe(60);
    expect(result.ml).toBe(20);
    expect(result.systems).toBe(40);
    expect(result.devops).toBe(50);
  });

  it("blends 60/40 when AI scores exist", () => {
    const b = makeBuilder({
      ai_backend: 90,
      ai_frontend: 70,
      ai_ml: 10,
      ai_systems: 60,
      ai_devops: 80,
    });
    const result = computeFinalSkills(b);
    // 0.6 * 90 + 0.4 * 80 = 54 + 32 = 86
    expect(result.backend).toBe(86);
    // 0.6 * 70 + 0.4 * 60 = 42 + 24 = 66
    expect(result.frontend).toBe(66);
    // 0.6 * 10 + 0.4 * 20 = 6 + 8 = 14
    expect(result.ml).toBe(14);
    // 0.6 * 60 + 0.4 * 40 = 36 + 16 = 52
    expect(result.systems).toBe(52);
    // 0.6 * 80 + 0.4 * 50 = 48 + 20 = 68
    expect(result.devops).toBe(68);
  });

  it("handles mixed AI presence (some null, some set)", () => {
    const b = makeBuilder({
      ai_backend: 90,
      ai_frontend: null,
    });
    const result = computeFinalSkills(b);
    expect(result.backend).toBe(86); // blended
    expect(result.frontend).toBe(60); // self only
  });
});

describe("getConfidenceLevel", () => {
  it("returns 'high' for >= 70", () => {
    expect(getConfidenceLevel(70)).toBe("high");
    expect(getConfidenceLevel(100)).toBe("high");
  });

  it("returns 'medium' for 40-69", () => {
    expect(getConfidenceLevel(40)).toBe("medium");
    expect(getConfidenceLevel(69)).toBe("medium");
  });

  it("returns 'low' for 1-39", () => {
    expect(getConfidenceLevel(1)).toBe("low");
    expect(getConfidenceLevel(39)).toBe("low");
  });

  it("returns 'none' for 0", () => {
    expect(getConfidenceLevel(0)).toBe("none");
  });
});

describe("hasAiSkills", () => {
  it("returns false for fresh builder", () => {
    expect(hasAiSkills(makeBuilder())).toBe(false);
  });

  it("returns true when ai_backend is set", () => {
    expect(hasAiSkills(makeBuilder({ ai_backend: 50 }))).toBe(true);
  });

  it("returns true when skills_last_analyzed is set", () => {
    expect(
      hasAiSkills(makeBuilder({ skills_last_analyzed: "2026-01-01" }))
    ).toBe(true);
  });
});

describe("selfToLegacySkills", () => {
  it("maps self_* to BuilderSkills format", () => {
    const result = selfToLegacySkills(makeBuilder());
    expect(result).toEqual({
      backend: 80,
      frontend: 60,
      ml: 20,
      systems_design: 40,
      devops: 50,
    });
  });
});

describe("finalToLegacySkills", () => {
  it("maps ComputedSkills to BuilderSkills format", () => {
    const result = finalToLegacySkills({
      backend: 86,
      frontend: 66,
      ml: 14,
      systems: 52,
      devops: 68,
    });
    expect(result).toEqual({
      backend: 86,
      frontend: 66,
      ml: 14,
      systems_design: 52,
      devops: 68,
    });
  });
});
