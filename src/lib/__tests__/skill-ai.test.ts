import { afterEach, describe, it, expect, vi } from "vitest";
import { analyzeSkillsWithAi, extractJsonObject } from "@/lib/skill-ai";
import type { SkillSignals } from "@/lib/skill-signals";

const signals = {
  backend: ["api route", "postgres"],
  frontend: ["react"],
  ml: [],
  systems: ["queue"],
  devops: ["ci", "docker", "vercel"],
} as unknown as SkillSignals;
const self = { backend: 60, frontend: 50, ml: 40, systems: 30, devops: 20 };

function reply(text: string, ok = true, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: ok ? status : 500 }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("extractJsonObject", () => {
  it("handles raw JSON, fences and surrounding prose", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJsonObject('Here you go: {"a":3} hope that helps')).toEqual({ a: 3 });
  });
  it("throws when there is no object", () => {
    expect(() => extractJsonObject("no json")).toThrow();
  });
});

describe("analyzeSkillsWithAi", () => {
  it("uses the deterministic fallback without a key and never calls the network", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const f = vi.fn();
    const r = await analyzeSkillsWithAi(signals, self, 3, 2, f as unknown as typeof fetch);
    expect(f).not.toHaveBeenCalled();
    expect(r.scores.ml).toBeLessThanOrEqual(15);
    expect(r.justification.backend).toMatch(/2 relevant/);
  });

  it("calls the Anthropic Messages API and parses + clamps the reply", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const f = reply(
      '```json\n{"scores":{"backend":72,"frontend":140,"ml":-3,"systems":"55","devops":61.6},"confidence":64,"justification":{"backend":"Two API services."}}\n```'
    );
    const r = await analyzeSkillsWithAi(signals, self, 3, 2, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(JSON.parse(String(init.body)).model).toBe("claude-haiku-4-5");
    expect(r.scores).toEqual({ backend: 72, frontend: 100, ml: 0, systems: 55, devops: 62 });
    expect(r.confidence).toBe(64);
    expect(r.justification.frontend).toBe("");
  });

  it("falls back on an API error", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await analyzeSkillsWithAi(signals, self, 3, 2, reply("", false) as unknown as typeof fetch);
    expect(r.justification.devops).toMatch(/3 relevant/);
  });

  it("falls back when the reply is not JSON", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await analyzeSkillsWithAi(signals, self, 3, 2, reply("I cannot help with that") as unknown as typeof fetch);
    expect(r.justification.frontend).toMatch(/1 relevant/);
  });
});
