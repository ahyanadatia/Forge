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

/**
 * Calls the OpenAI API to analyze skill signals.
 * Falls back to deterministic heuristic if no API key is configured.
 */
export async function analyzeSkillsWithAi(
  signals: SkillSignals,
  selfScores: SkillScores,
  repoCount: number,
  deliveryCount: number
): Promise<AiSkillResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return deterministicFallback(signals, selfScores, repoCount, deliveryCount);
  }

  const prompt = buildPrompt(signals, selfScores, repoCount, deliveryCount);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise technical skill assessment engine. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI API error:", res.status, await res.text());
      return deterministicFallback(signals, selfScores, repoCount, deliveryCount);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    const parsed = JSON.parse(raw);

    return {
      scores: {
        backend: clampScore(parsed.scores?.backend),
        frontend: clampScore(parsed.scores?.frontend),
        ml: clampScore(parsed.scores?.ml),
        systems: clampScore(parsed.scores?.systems),
        devops: clampScore(parsed.scores?.devops),
      },
      confidence: clampScore(parsed.confidence),
      justification: {
        backend: parsed.justification?.backend ?? "",
        frontend: parsed.justification?.frontend ?? "",
        ml: parsed.justification?.ml ?? "",
        systems: parsed.justification?.systems ?? "",
        devops: parsed.justification?.devops ?? "",
      },
    };
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
