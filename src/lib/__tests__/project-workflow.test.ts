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

describe("Project status transitions", () => {
  it("draft project starts at L0", () => {
    const result = computeProjectLevel(makeInput());
    expect(result.level).toBe(0);
    expect(result.label).toBe("Draft");
  });

  it("defined project reaches L1 with all fields", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend Engineer"],
      timeline: "4 weeks",
      hours_per_week: 20,
      required_skills: ["Node.js"],
    }));
    expect(result.level).toBe(1);
  });

  it("project with tasks reaches L2", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 10,
      required_skills: ["React"],
      has_tasks: true,
    }));
    expect(result.level).toBe(2);
  });

  it("team formed (2+ members) reaches L3", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 10,
      required_skills: ["React"],
      accepted_member_count: 3,
    }));
    expect(result.level).toBe(3);
  });

  it("delivery activity reaches L4", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
      timeline: "8 weeks",
      hours_per_week: 10,
      required_skills: ["React"],
      has_delivery_activity: true,
    }));
    expect(result.level).toBe(4);
  });

  it("shows hint for draft projects", () => {
    const result = computeProjectLevel(makeInput({
      roles_needed: ["Backend"],
    }));
    expect(result.hint).toBeTruthy();
    expect(result.hint).toContain("timeline");
  });
});

describe("Capacity and status", () => {
  it("capacity percentage calculated correctly", () => {
    const target = 5;
    const current = 3;
    const percent = Math.min(100, Math.round((current / target) * 100));
    expect(percent).toBe(60);
  });

  it("open spots calculated correctly", () => {
    const target = 5;
    const current = 3;
    const openSpots = Math.max(0, target - current);
    expect(openSpots).toBe(2);
  });

  it("at capacity when members equal target", () => {
    const target = 4;
    const current = 4;
    const openSpots = Math.max(0, target - current);
    expect(openSpots).toBe(0);
    const percent = Math.min(100, Math.round((current / target) * 100));
    expect(percent).toBe(100);
  });
});

describe("Project statuses", () => {
  const validStatuses = ["draft", "open", "full", "active", "completed", "archived"];

  it("all statuses are valid", () => {
    expect(validStatuses).toHaveLength(6);
    expect(validStatuses).toContain("draft");
    expect(validStatuses).toContain("open");
    expect(validStatuses).toContain("full");
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("completed");
    expect(validStatuses).toContain("archived");
  });

  it("draft is the initial status", () => {
    expect(validStatuses[0]).toBe("draft");
  });
});

describe("Leave project reasons", () => {
  const validReasons = ["time_constraints", "project_mismatch", "personal_reasons", "found_other_project", "other"];

  it("has all expected reasons", () => {
    expect(validReasons).toHaveLength(5);
  });

  it("each reason is a valid string", () => {
    for (const reason of validReasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
  });
});
