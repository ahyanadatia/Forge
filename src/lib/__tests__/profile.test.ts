import { describe, it, expect } from "vitest";
import { getDisplayName, getInitials, buildFullName } from "../profile";
import type { Builder } from "@/types";

function makeBuilder(overrides: Partial<Builder> = {}): Builder {
  return {
    id: "1",
    email: "test@test.com",
    full_name: "Ahyan Adatia",
    first_name: "Ahyan",
    middle_names: null,
    last_name: "Adatia",
    display_name: null,
    avatar_url: null,
    github_username: null,
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
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("getDisplayName", () => {
  it("returns display_name when set", () => {
    const b = makeBuilder({ display_name: "AJ" });
    expect(getDisplayName(b)).toBe("AJ");
  });

  it("constructs from first + last when no display_name", () => {
    const b = makeBuilder();
    expect(getDisplayName(b)).toBe("Ahyan Adatia");
  });

  it("includes middle_names in constructed name", () => {
    const b = makeBuilder({ middle_names: "Ali" });
    expect(getDisplayName(b)).toBe("Ahyan Ali Adatia");
  });

  it("falls back to full_name if parts missing", () => {
    const b = makeBuilder({
      first_name: "" as any,
      last_name: "" as any,
      full_name: "Fallback Name",
    });
    expect(getDisplayName(b)).toBe("Fallback Name");
  });

  it("works with raw row object (no typed Builder)", () => {
    const row = { display_name: null, first_name: "Jane", middle_names: null, last_name: "Doe", full_name: "Jane Doe" };
    expect(getDisplayName(row)).toBe("Jane Doe");
  });
});

describe("getInitials", () => {
  it("returns 2-char initials from first + last", () => {
    const b = makeBuilder();
    expect(getInitials(b)).toBe("AA");
  });

  it("returns initials from display_name", () => {
    const b = makeBuilder({ display_name: "John Smith" });
    expect(getInitials(b)).toBe("JS");
  });

  it("handles single-word names", () => {
    const b = makeBuilder({ display_name: "Mononym" });
    expect(getInitials(b)).toBe("M");
  });

  it("handles three-part names and caps at 2 initials", () => {
    const b = makeBuilder({ middle_names: "Ali" });
    expect(getInitials(b)).toBe("AA");
  });
});

describe("buildFullName", () => {
  it("joins first and last", () => {
    expect(buildFullName("Ahyan", null, "Adatia")).toBe("Ahyan Adatia");
  });

  it("includes middle names", () => {
    expect(buildFullName("Ahyan", "Ali", "Adatia")).toBe("Ahyan Ali Adatia");
  });
});
