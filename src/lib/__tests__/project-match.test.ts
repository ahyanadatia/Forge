import { describe, it, expect } from "vitest";
import {
  computeCompatibility,
  type CompatibilityInput,
  type BuilderMatchProfile,
  type ProjectMatchProfile,
} from "../matching/project-match";

function makeBuilder(overrides: Partial<BuilderMatchProfile> = {}): BuilderMatchProfile {
  return {
    id: "b1",
    full_name: "Test Builder",
    username: "testbuilder",
    avatar_url: null,
    role_descriptor: "Backend Engineer",
    availability: "available",
    primary_stack: "Node.js, TypeScript",
    secondary_stack: "Python",
    commitment_preferences: "20 hours/week",
    forge_score: 500,
    confidence_score: 50,
    delivery_success_score: 60,
    reliability_score: 70,
    delivery_quality_score: 50,
    consistency_score: 40,
    self_backend: 80,
    self_frontend: 30,
    self_ml: 10,
    self_systems: 40,
    self_devops: 20,
    ai_backend: null,
    ai_frontend: null,
    ai_ml: null,
    ai_systems: null,
    ai_devops: null,
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectMatchProfile> = {}): ProjectMatchProfile {
  return {
    required_skills: ["Backend", "Node.js"],
    hours_per_week: 20,
    hours_per_week_min: 15,
    hours_per_week_max: 25,
    timeline_weeks: 8,
    team_size: 3,
    category: "saas",
    stage: "mvp",
    roles_needed: ["Backend Engineer"],
    tags: ["typescript", "api"],
    ...overrides,
  };
}

describe("computeCompatibility", () => {
  it("returns score between 0 and 100", () => {
    const result = computeCompatibility({
      project: makeProject(),
      builder: makeBuilder(),
    });
    expect(result.scorePercent).toBeGreaterThanOrEqual(0);
    expect(result.scorePercent).toBeLessThanOrEqual(100);
    expect(result.score01).toBeGreaterThanOrEqual(0);
    expect(result.score01).toBeLessThanOrEqual(1);
  });

  it("has all breakdown components", () => {
    const result = computeCompatibility({
      project: makeProject(),
      builder: makeBuilder(),
    });
    expect(result.breakdown).toHaveProperty("skillFit");
    expect(result.breakdown).toHaveProperty("reliabilityFit");
    expect(result.breakdown).toHaveProperty("executionFit");
    expect(result.breakdown).toHaveProperty("stackFit");
    expect(result.breakdown).toHaveProperty("commitmentFit");
  });

  it("returns 1-3 reasons", () => {
    const result = computeCompatibility({
      project: makeProject(),
      builder: makeBuilder(),
    });
    expect(result.reasons.length).toBeGreaterThanOrEqual(1);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
  });

  it("weights sum to 100", () => {
    const result = computeCompatibility({
      project: makeProject(),
      builder: makeBuilder(),
    });
    const { breakdown } = result;
    const weighted =
      0.35 * breakdown.skillFit +
      0.25 * breakdown.reliabilityFit +
      0.15 * breakdown.executionFit +
      0.15 * breakdown.stackFit +
      0.10 * breakdown.commitmentFit;
    expect(Math.round(weighted)).toBe(result.scorePercent);
  });

  it("builder with high backend skills scores higher for backend project", () => {
    const backendBuilder = makeBuilder({ self_backend: 90, ai_backend: 85 });
    const frontendBuilder = makeBuilder({ self_backend: 20, self_frontend: 90 });
    const project = makeProject({ required_skills: ["Backend", "API"], roles_needed: ["Backend Engineer"] });

    const backendResult = computeCompatibility({ project, builder: backendBuilder });
    const frontendResult = computeCompatibility({ project, builder: frontendBuilder });

    expect(backendResult.breakdown.skillFit).toBeGreaterThan(frontendResult.breakdown.skillFit);
  });

  it("available builder gets higher commitment fit", () => {
    const available = makeBuilder({ availability: "available" });
    const busy = makeBuilder({ availability: "busy" });

    const project = makeProject();
    const r1 = computeCompatibility({ project, builder: available });
    const r2 = computeCompatibility({ project, builder: busy });

    expect(r1.breakdown.commitmentFit).toBeGreaterThan(r2.breakdown.commitmentFit);
  });

  it("reliable builder scores higher on reliability fit", () => {
    const reliable = makeBuilder({ reliability_score: 90 });
    const unreliable = makeBuilder({ reliability_score: 20 });

    const project = makeProject();
    const r1 = computeCompatibility({ project, builder: reliable });
    const r2 = computeCompatibility({ project, builder: unreliable });

    expect(r1.breakdown.reliabilityFit).toBeGreaterThan(r2.breakdown.reliabilityFit);
  });
});
