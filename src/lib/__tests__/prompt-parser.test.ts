import { describe, it, expect } from "vitest";
import {
  parseBuilderPrompt,
  parseProjectPrompt,
} from "../prompt-parser";

describe("parseBuilderPrompt", () => {
  it("extracts skill keywords", () => {
    const result = parseBuilderPrompt("backend frontend");
    expect(result.skills).toContain("backend");
    expect(result.skills).toContain("frontend");
  });

  it("extracts score threshold", () => {
    const result = parseBuilderPrompt("700+ backend");
    expect(result.minScore).toBe(700);
    expect(result.skills).toContain("backend");
  });

  it("extracts availability", () => {
    const result = parseBuilderPrompt("available backend");
    expect(result.availability).toBe("available");
    expect(result.skills).toContain("backend");
  });

  it('maps "reliable" to minCompletionRate', () => {
    const result = parseBuilderPrompt("reliable backend");
    expect(result.minCompletionRate).toBe(85);
  });

  it("extracts stacks", () => {
    const result = parseBuilderPrompt("nextjs python postgres");
    expect(result.stacks).toContain("Next.js");
    expect(result.stacks).toContain("Python");
    expect(result.stacks).toContain("PostgreSQL");
  });

  it("extracts hours range", () => {
    const result = parseBuilderPrompt("5-10 h/week");
    expect(result.minHoursPerWeek).toBe(5);
    expect(result.maxHoursPerWeek).toBe(10);
  });

  it('detects "top" or "best" as sortBy=score', () => {
    const result = parseBuilderPrompt("top backend engineers");
    expect(result.sortBy).toBe("score");
  });

  it("leaves remaining text as query", () => {
    const result = parseBuilderPrompt("john doe backend");
    expect(result.skills).toContain("backend");
    expect(result.query).toContain("john doe");
  });

  it("handles empty prompt", () => {
    const result = parseBuilderPrompt("");
    expect(result.skills).toBeUndefined();
    expect(result.query).toBeUndefined();
  });

  it("handles complex combined prompt", () => {
    const result = parseBuilderPrompt("reliable top 600+ backend nextjs available");
    expect(result.minCompletionRate).toBe(85);
    expect(result.sortBy).toBe("score");
    expect(result.minScore).toBe(600);
    expect(result.skills).toContain("backend");
    expect(result.stacks).toContain("Next.js");
    expect(result.availability).toBe("available");
  });
});

describe("parseProjectPrompt", () => {
  it("extracts category", () => {
    const result = parseProjectPrompt("saas project");
    expect(result.category).toBe("saas");
  });

  it("extracts stage", () => {
    const result = parseProjectPrompt("mvp stage project");
    expect(result.stage).toBe("mvp");
  });

  it("extracts timeline weeks", () => {
    const result = parseProjectPrompt("8 weeks project");
    expect(result.maxTimelineWeeks).toBe(8);
  });

  it("extracts hours range", () => {
    const result = parseProjectPrompt("10-20 h/week");
    expect(result.minHoursPerWeek).toBe(10);
    expect(result.maxHoursPerWeek).toBe(20);
  });

  it("creates FTS query from remaining text", () => {
    const result = parseProjectPrompt("realtime dashboard");
    expect(result.ftsQuery).toBe("realtime & dashboard");
  });

  it("handles empty prompt", () => {
    const result = parseProjectPrompt("");
    expect(result.category).toBeUndefined();
    expect(result.ftsQuery).toBeUndefined();
  });

  it("handles combined prompt", () => {
    const result = parseProjectPrompt("saas mvp 4 weeks realtime");
    expect(result.category).toBe("saas");
    expect(result.stage).toBe("mvp");
    expect(result.maxTimelineWeeks).toBe(4);
    expect(result.ftsQuery).toBeDefined();
  });
});
