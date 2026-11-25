import type { SkillScores } from "@/types";
import type { SkillSignals } from "./skill-signals";

export interface AiSkillResult {
  scores: SkillScores;
  confidence: number;
  justification: {
    backend: string;
    frontend: string;
    ml: string;
    systems: string;
    devops: string;
  };
}

/**
 * Builds the structured prompt for LLM skill estimation.
 */
function buildPrompt(
  signals: SkillSignals,
  selfScores: SkillScores,
  repoCount: number,
  deliveryCount: number
): string {
  return `You are a technical skill assessment engine for a professional platform called Forge.

Analyze the evidence below and estimate the builder's proficiency in each skill area.

EVIDENCE:

GitHub repositories analyzed: ${repoCount}
Deliveries analyzed: ${deliveryCount}

Backend evidence (${signals.backend.length} items):
${signals.backend.length > 0 ? signals.backend.map((s) => `  - ${s}`).join("\n") : "  None found"}

Frontend evidence (${signals.frontend.length} items):
${signals.frontend.length > 0 ? signals.frontend.map((s) => `  - ${s}`).join("\n") : "  None found"}

ML/AI evidence (${signals.ml.length} items):
${signals.ml.length > 0 ? signals.ml.map((s) => `  - ${s}`).join("\n") : "  None found"}

Systems Design evidence (${signals.systems.length} items):
${signals.systems.length > 0 ? signals.systems.map((s) => `  - ${s}`).join("\n") : "  None found"}

DevOps evidence (${signals.devops.length} items):
${signals.devops.length > 0 ? signals.devops.map((s) => `  - ${s}`).join("\n") : "  None found"}

Builder's self-assessment:
  Backend: ${selfScores.backend}
  Frontend: ${selfScores.frontend}
  ML/AI: ${selfScores.ml}
  Systems Design: ${selfScores.systems}
  DevOps: ${selfScores.devops}

TASK:

Return a JSON object with exactly this shape (no markdown, no code fences, just raw JSON):
{
  "scores": {
    "backend": <0-100>,
    "frontend": <0-100>,
    "ml": <0-100>,
    "systems": <0-100>,
    "devops": <0-100>
  },
  "confidence": <0-100>,
  "justification": {
    "backend": "<one sentence>",
    "frontend": "<one sentence>",
    "ml": "<one sentence>",
    "systems": "<one sentence>",
    "devops": "<one sentence>"
  }
}

Rules:
- Base scores primarily on evidence quantity and quality.
- If no evidence exists for a skill, score should be low (0-20) regardless of self-assessment.
- If evidence is strong and plentiful, score can exceed self-assessment.
- Confidence reflects how much evidence was available overall.
- Be conservative. Do not inflate scores without evidence.`;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5";
const TIMEOUT_MS = 20_000;

/** Pulls the first JSON object out of a model reply, tolerating code fences or prose. */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

function toResult(parsed: unknown): AiSkillResult {
  const p = (parsed ?? {}) as {
    scores?: Record<string, unknown>;
    confidence?: unknown;
    justification?: Record<string, unknown>;
  };
  const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  return {
    scores: {
      backend: clampScore(p.scores?.backend),
      frontend: clampScore(p.scores?.frontend),
      ml: clampScore(p.scores?.ml),
      systems: clampScore(p.scores?.systems),
      devops: clampScore(p.scores?.devops),
    },
    confidence: clampScore(p.confidence),
    justification: {
      backend: text(p.justification?.backend),
      frontend: text(p.justification?.frontend),
      ml: text(p.justification?.ml),
      systems: text(p.justification?.systems),
      devops: text(p.justification?.devops),
    },
  };
}

/**
 * Asks Claude to estimate skill levels from the evidence.
 * Falls back to a deterministic heuristic when ANTHROPIC_API_KEY is unset,
 * the request fails or times out, or the reply isn't valid JSON, so skill
 * analysis always returns something sensible.
 */
export async function analyzeSkillsWithAi(
  signals: SkillSignals,
  selfScores: SkillScores,
  repoCount: number,
  deliveryCount: number,
  fetchImpl: typeof fetch = fetch
): Promise<AiSkillResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return deterministicFallback(signals, selfScores, repoCount, deliveryCount);
  }

  const prompt = buildPrompt(signals, selfScores, repoCount, deliveryCount);

  try {
    const res = await fetchImpl(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 800,
        temperature: 0.2,
        system: "You are a precise technical skill assessment engine. Reply with one JSON object and nothing else.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status);
      return deterministicFallback(signals, selfScores, repoCount, deliveryCount);
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");

    return toResult(extractJsonObject(raw));
  } catch (err) {
    console.error("AI analysis failed, using deterministic fallback:", err);
    return deterministicFallback(signals, selfScores, repoCount, deliveryCount);
  }
}

function clampScore(v: unknown): number {
  const n = Number(v);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Deterministic fallback when no LLM is available.
 * Scores based purely on evidence counts.
 */
function deterministicFallback(
  signals: SkillSignals,
  selfScores: SkillScores,
  repoCount: number,
  deliveryCount: number
): AiSkillResult {
  const total = repoCount + deliveryCount;
  const confidence = Math.min(100, Math.round((total / 20) * 100));

  function scoreFromEvidence(count: number, self: number): number {
    if (count === 0) return Math.min(self, 15);
    if (count <= 2) return Math.min(Math.max(self, 30), 50);
    if (count <= 5) return Math.min(Math.max(self, 50), 75);
    return Math.min(Math.max(self, 65), 90);
  }

  return {
    scores: {
      backend: scoreFromEvidence(signals.backend.length, selfScores.backend),
      frontend: scoreFromEvidence(signals.frontend.length, selfScores.frontend),
      ml: scoreFromEvidence(signals.ml.length, selfScores.ml),
      systems: scoreFromEvidence(signals.systems.length, selfScores.systems),
      devops: scoreFromEvidence(signals.devops.length, selfScores.devops),
    },
    confidence,
    justification: {
      backend: `${signals.backend.length} relevant repos/deliveries found.`,
      frontend: `${signals.frontend.length} relevant repos/deliveries found.`,
      ml: `${signals.ml.length} relevant repos/deliveries found.`,
      systems: `${signals.systems.length} relevant repos/deliveries found.`,
      devops: `${signals.devops.length} relevant repos/deliveries found.`,
    },
  };
}
