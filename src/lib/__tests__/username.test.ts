import { describe, it, expect } from "vitest";
import {
  validateUsername,
  normalizeUsername,
  isReservedUsername,
} from "../username";

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  HelloWorld  ")).toBe("helloworld");
  });
  it("preserves underscores", () => {
    expect(normalizeUsername("hello_world")).toBe("hello_world");
  });
});

describe("validateUsername", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("alice").valid).toBe(true);
    expect(validateUsername("bob_42").valid).toBe(true);
    expect(validateUsername("a1b").valid).toBe(true);
    expect(validateUsername("user_name_123").valid).toBe(true);
  });

  it("rejects too short", () => {
    const result = validateUsername("ab");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least 3");
  });

  it("rejects too long", () => {
    const result = validateUsername("a".repeat(21));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most 20");
  });

  it("rejects starting with underscore", () => {
    const result = validateUsername("_hello");
    expect(result.valid).toBe(false);
  });

  it("rejects ending with underscore", () => {
    const result = validateUsername("hello_");
    expect(result.valid).toBe(false);
  });

  it("rejects double underscores", () => {
    const result = validateUsername("he__lo");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("consecutive underscores");
  });

  it("rejects uppercase (after normalization)", () => {
    const result = validateUsername("Hello");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("hello");
  });

  it("rejects special characters", () => {
    expect(validateUsername("hello!").valid).toBe(false);
    expect(validateUsername("hello world").valid).toBe(false);
    expect(validateUsername("hello-world").valid).toBe(false);
    expect(validateUsername("hello.world").valid).toBe(false);
  });

  it("rejects reserved words", () => {
    const result = validateUsername("admin");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("reserved");
  });

  it("returns normalized on success", () => {
    const result = validateUsername("Alice42");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("alice42");
  });
});

describe("isReservedUsername", () => {
  it("detects reserved usernames", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("ADMIN")).toBe(true);
    expect(isReservedUsername("settings")).toBe(true);
    expect(isReservedUsername("forge")).toBe(true);
  });

  it("allows non-reserved", () => {
    expect(isReservedUsername("alice")).toBe(false);
    expect(isReservedUsername("bob42")).toBe(false);
  });
});
