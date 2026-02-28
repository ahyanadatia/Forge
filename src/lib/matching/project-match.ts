/**
 * Project-Builder Compatibility Score
 *
 * Weighted components (sum to 100%):
 *   Skill Fit       35%
 *   Reliability Fit  25%
 *   Execution Fit    15%
 *   Stack Fit        15%
 *   Commitment Fit   10%
 */

export interface CompatibilityInput {
  project: ProjectMatchProfile;
  builder: BuilderMatchProfile;
}

export interface ProjectMatchProfile {
  required_skills: string[];
  hours_per_week: number;
  hours_per_week_min?: number | null;
  hours_per_week_max?: number | null;
  timeline_weeks?: number | null;
  team_size: number;
  category?: string | null;
  stage?: string | null;
  roles_needed: string[];
  tags: string[];
}

export interface BuilderMatchProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role_descriptor: string | null;
  availability: string;
  primary_stack: string | null;
  secondary_stack: string | null;
  commitment_preferences: string | null;
  forge_score: number;
  confidence_score: number;
  delivery_success_score: number;
  reliability_score: number;
  delivery_quality_score: number;
  consistency_score: number;
  self_backend: number;
  self_frontend: number;
  self_ml: number;
  self_systems: number;
  self_devops: number;
  ai_backend: number | null;
  ai_frontend: number | null;
  ai_ml: number | null;
  ai_systems: number | null;
  ai_devops: number | null;
}

export interface CompatibilityOutput {
  score01: number;
  scorePercent: number;
  breakdown: CompatibilityBreakdown;
  reasons: string[];
}

export interface CompatibilityBreakdown {
  skillFit: number;
  reliabilityFit: number;
  executionFit: number;
  stackFit: number;
  commitmentFit: number;
}

const SKILL_KEYWORDS: Record<string, string[]> = {
  backend: ["backend", "node", "python", "go", "java", "rust", "django", "fastapi", "express", "api", "server"],
  frontend: ["frontend", "react", "vue", "angular", "next", "svelte", "css", "tailwind", "ui", "ux"],
  ml: ["ml", "machine learning", "ai", "data science", "tensorflow", "pytorch", "nlp", "computer vision"],
  systems_design: ["systems", "architecture", "distributed", "infrastructure", "scaling", "design"],
  devops: ["devops", "aws", "gcp", "azure", "docker", "kubernetes", "ci/cd", "terraform", "infra"],
};

function getEffectiveSkill(builder: BuilderMatchProfile, dimension: string): number {
  const selfKey = `self_${dimension === "systems_design" ? "systems" : dimension}` as keyof BuilderMatchProfile;
  const aiKey = `ai_${dimension === "systems_design" ? "systems" : dimension}` as keyof BuilderMatchProfile;
  const selfVal = (builder[selfKey] as number) ?? 0;
  const aiVal = builder[aiKey] as number | null;
  if (aiVal != null) return 0.4 * selfVal + 0.6 * aiVal;
  return selfVal;
}

function computeSkillFit(project: ProjectMatchProfile, builder: BuilderMatchProfile): number {
  if (project.required_skills.length === 0 && project.roles_needed.length === 0) return 70;

  const allTerms = [
    ...project.required_skills.map(s => s.toLowerCase()),
    ...project.roles_needed.map(r => r.toLowerCase()),
  ];

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const [dimension, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const relevance = allTerms.filter(t => keywords.some(k => t.includes(k))).length;
    if (relevance === 0) continue;

    const weight = relevance;
    totalWeight += weight;
    const skill = getEffectiveSkill(builder, dimension);
    matchedWeight += weight * (skill / 100);
  }

  if (totalWeight === 0) return 50;
  return Math.round(100 * (matchedWeight / totalWeight));
}

function computeStackFit(project: ProjectMatchProfile, builder: BuilderMatchProfile): number {
  const projectStacks = [
    ...project.required_skills,
    ...project.tags,
  ].map(s => s.toLowerCase());

  if (projectStacks.length === 0) return 50;

  const builderStacks = [
    builder.primary_stack,
    builder.secondary_stack,
  ]
    .filter(Boolean)
    .join(", ")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  if (builderStacks.length === 0) return 30;

  let matches = 0;
  for (const ps of projectStacks) {
    if (builderStacks.some(bs => ps.includes(bs) || bs.includes(ps))) {
      matches++;
    }
  }

  return Math.min(100, Math.round((matches / Math.max(projectStacks.length, 1)) * 100));
}

function computeReliabilityFit(builder: BuilderMatchProfile): number {
  return builder.reliability_score;
}

function computeExecutionFit(builder: BuilderMatchProfile): number {
  const ds = builder.delivery_success_score;
  const dq = builder.delivery_quality_score;
  return Math.round(0.6 * ds + 0.4 * dq);
}

function computeCommitmentFit(project: ProjectMatchProfile, builder: BuilderMatchProfile): number {
  let score = 50;

  // Availability
  if (builder.availability === "available") score += 30;
  else if (builder.availability === "open_to_opportunities") score += 15;
  else if (builder.availability === "busy") score -= 20;
  else score -= 40;

  // Hours match
  if (builder.commitment_preferences) {
    const match = builder.commitment_preferences.match(/(\d+)/);
    if (match) {
      const builderHours = parseInt(match[1], 10);
      const projectMin = project.hours_per_week_min ?? project.hours_per_week;
      const projectMax = project.hours_per_week_max ?? project.hours_per_week;
      if (builderHours >= projectMin && builderHours <= projectMax) score += 20;
      else if (Math.abs(builderHours - project.hours_per_week) <= 5) score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function generateReasons(breakdown: CompatibilityBreakdown, builder: BuilderMatchProfile): string[] {
  const reasons: string[] = [];
  const entries: [string, number, string][] = [
    ["skillFit", breakdown.skillFit, "Strong skill fit for required capabilities"],
    ["reliabilityFit", breakdown.reliabilityFit, "High completion reliability"],
    ["executionFit", breakdown.executionFit, "Proven execution track record"],
    ["stackFit", breakdown.stackFit, "Stack experience matches requirements"],
    ["commitmentFit", breakdown.commitmentFit, "Availability matches requirement"],
  ];

  entries.sort((a, b) => b[1] - a[1]);

  for (const [, score, reason] of entries) {
    if (score >= 50 && reasons.length < 3) {
      reasons.push(reason);
    }
  }

  if (builder.forge_score >= 600 && reasons.length < 3) {
    reasons.push("High Forge Score indicates strong builder");
  }
  if (builder.confidence_score >= 65 && reasons.length < 3) {
    reasons.push("High confidence in score accuracy");
  }

  if (reasons.length === 0) {
    reasons.push("Potential fit based on available data");
  }

  return reasons.slice(0, 3);
}

export function computeCompatibility(input: CompatibilityInput): CompatibilityOutput {
  const { project, builder } = input;

  const breakdown: CompatibilityBreakdown = {
    skillFit: computeSkillFit(project, builder),
    reliabilityFit: computeReliabilityFit(builder),
    executionFit: computeExecutionFit(builder),
    stackFit: computeStackFit(project, builder),
    commitmentFit: computeCommitmentFit(project, builder),
  };

  const weighted =
    0.35 * (breakdown.skillFit / 100) +
    0.25 * (breakdown.reliabilityFit / 100) +
    0.15 * (breakdown.executionFit / 100) +
    0.15 * (breakdown.stackFit / 100) +
    0.10 * (breakdown.commitmentFit / 100);

  const score01 = Math.max(0, Math.min(1, weighted));
  const scorePercent = Math.round(score01 * 100);

  return {
    score01,
    scorePercent,
    breakdown,
    reasons: generateReasons(breakdown, builder),
  };
}
