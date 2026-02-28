import { describe, it, expect } from "vitest";
import {
  computeProjectLevel,
  type ProjectLevelInput,
} from "../matching/project-level";

function makeInput(overrides: Partial<ProjectLevelInput> = {}): ProjectLevelInput {
  return {
    roles_needed: [],
    timeline: null,
    timeline_weeks: null,
    hours_per_week: null,
    required_skills: [],
    has_tasks: false,
    accepted_member_count: 0,
    has_delivery_activity: false,
    ...overrides,
  };
}

describe("computeProjectLevel", () => {
  it("L0 when missing roles, timeline, hours", () => {
    const result = computeProjectLevel(makeInput());
    expect(result.level).toBe(0);
    expect(result.shortLabel).toBe("L0");
    expect(result.label).toBe("Draft");
    expect(result.hint).toBeTruthy();
  });

  it("L1 when roles + timeline + hours + skills defined", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
    }));
    expect(result.level).toBe(1);
    expect(result.label).toBe("Defined");
  });

  it("L2 when L1 + tasks exist", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
      has_tasks: true,
    }));
    expect(result.level).toBe(2);
    expect(result.label).toBe("Validated Plan");
  });

  it("L3 when 2+ accepted members", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
      accepted_member_count: 3,
    }));
    expect(result.level).toBe(3);
    expect(result.label).toBe("Team Formed");
  });

  it("L4 when delivery activity exists", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
      has_delivery_activity: true,
    }));
    expect(result.level).toBe(4);
    expect(result.label).toBe("Shipping");
  });

  it("stays L0 if only some fields are filled", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
    }));
    expect(result.level).toBe(0);
    expect(result.hint).toContain("hours/week");
  });

  it("L1 shows improvement hint to add tasks", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
    }));
    expect(result.hint).toContain("milestones");
  });

  it("timeline_weeks counts as timeline", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline_weeks: 8,
      hours_per_week: 20,
      required_skills: ["Node.js"],
    }));
    expect(result.level).toBe(1);
  });
});
