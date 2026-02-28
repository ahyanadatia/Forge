import type { Builder, SkillScores, SkillConfidenceLevel } from "@/types";

const AI_WEIGHT = 0.6;
const SELF_WEIGHT = 0.4;

export interface ComputedSkills {
  backend: number;
  frontend: number;
  ml: number;
  systems: number;
  devops: number;
}

/**
 * Computes final skill scores using the weighted formula:
 *   final = 0.6 * ai_score + 0.4 * self_score
 * Falls back to self_score alone when AI data is absent.
 */
export function computeFinalSkills(builder: Builder): ComputedSkills {
  return {
    backend: blend(builder.ai_backend, builder.self_backend),
    frontend: blend(builder.ai_frontend, builder.self_frontend),
    ml: blend(builder.ai_ml, builder.self_ml),
    systems: blend(builder.ai_systems, builder.self_systems),
    devops: blend(builder.ai_devops, builder.self_devops),
  };
}

function blend(ai: number | null, self: number): number {
  if (ai === null || ai === undefined) return self;
  return Math.round(AI_WEIGHT * ai + SELF_WEIGHT * self);
}

/**
 * Maps confidence 0-100 to a human-readable level.
 */
export function getConfidenceLevel(confidence: number): SkillConfidenceLevel {
  if (confidence >= 70) return "high";
  if (confidence >= 40) return "medium";
  if (confidence > 0) return "low";
  return "none";
}

/**
 * Returns whether a builder has AI-analyzed skills.
 */
export function hasAiSkills(builder: Builder): boolean {
  return builder.ai_backend !== null || builder.skills_last_analyzed !== null;
}

/**
 * Converts the new self_* fields to the legacy BuilderSkills JSONB format
 * for backward compatibility with matching and insights.
 */
export function selfToLegacySkills(builder: Builder) {
  return {
    backend: builder.self_backend ?? 0,
    frontend: builder.self_frontend ?? 0,
    ml: builder.self_ml ?? 0,
    systems_design: builder.self_systems ?? 0,
    devops: builder.self_devops ?? 0,
  };
}

/**
 * Converts computed final skills to legacy BuilderSkills JSONB format.
 */
export function finalToLegacySkills(computed: ComputedSkills) {
  return {
    backend: computed.backend,
    frontend: computed.frontend,
    ml: computed.ml,
    systems_design: computed.systems,
    devops: computed.devops,
  };
}
