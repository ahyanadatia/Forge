/**
 * Deterministic prompt parser: maps natural-language search text into structured filters.
 * No LLM required.
 */

export interface BuilderFilters {
  query?: string;
  skills?: string[];
  availability?: string;
  minScore?: number;
  minHoursPerWeek?: number;
  maxHoursPerWeek?: number;
  minCompletionRate?: number;
  stacks?: string[];
  sortBy?: "score" | "recency" | "reliability";
}

export interface ProjectFilters {
  query?: string;
  ftsQuery?: string;
  category?: string;
  stage?: string;
  tags?: string[];
  rolesNeeded?: string[];
  minHoursPerWeek?: number;
  maxHoursPerWeek?: number;
  maxTimelineWeeks?: number;
  sortBy?: "recency" | "relevance";
}

const SKILL_MAP: Record<string, string> = {
  backend: "backend",
  "back-end": "backend",
  frontend: "frontend",
  "front-end": "frontend",
  ml: "ml",
  "machine learning": "ml",
  ai: "ml",
  devops: "devops",
  "dev-ops": "devops",
  infrastructure: "devops",
  systems: "systems_design",
  "systems design": "systems_design",
  architecture: "systems_design",
};

const STACK_MAP: Record<string, string> = {
  nextjs: "Next.js",
  "next.js": "Next.js",
  react: "React",
  vue: "Vue",
  angular: "Angular",
  node: "Node.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  python: "Python",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  supabase: "Supabase",
  firebase: "Firebase",
  typescript: "TypeScript",
  ts: "TypeScript",
  go: "Go",
  golang: "Go",
  rust: "Rust",
  java: "Java",
  swift: "Swift",
  kotlin: "Kotlin",
  "react native": "React Native",
  flutter: "Flutter",
  tailwind: "Tailwind CSS",
  graphql: "GraphQL",
};

const AVAILABILITY_MAP: Record<string, string> = {
  available: "available",
  free: "available",
  open: "open_to_opportunities",
  "open to opportunities": "open_to_opportunities",
  busy: "busy",
  unavailable: "unavailable",
};

const CATEGORY_MAP: Record<string, string> = {
  saas: "saas",
  marketplace: "marketplace",
  "developer tool": "developer_tool",
  "dev tool": "developer_tool",
  "ai/ml": "ai_ml",
  "ai ml": "ai_ml",
  fintech: "fintech",
  healthtech: "healthtech",
  edtech: "edtech",
  social: "social",
  ecommerce: "ecommerce",
  "e-commerce": "ecommerce",
  "data analytics": "data_analytics",
  analytics: "data_analytics",
  devops: "devops_infra",
  "mobile app": "mobile_app",
  mobile: "mobile_app",
  "web app": "web_app",
  api: "api_service",
  "open source": "open_source",
  oss: "open_source",
};

const STAGE_MAP: Record<string, string> = {
  idea: "idea",
  prototype: "prototype",
  mvp: "mvp",
  beta: "beta",
  launched: "launched",
  live: "launched",
  scaling: "scaling",
  growth: "scaling",
};

const HOURS_REGEX = /(\d+)\s*-\s*(\d+)\s*(?:h(?:ours?)?(?:\s*\/?\s*(?:wk|week))?)?/i;
const SCORE_REGEX = /(\d{3,4})\s*\+/;
const TIMELINE_REGEX = /(\d+)\s*(?:weeks?|wks?)/i;

export function parseBuilderPrompt(prompt: string): BuilderFilters {
  const filters: BuilderFilters = {};
  let remaining = prompt.toLowerCase().trim();

  // "reliable" keyword
  if (/\breliable\b|\breliability\b/.test(remaining)) {
    filters.minCompletionRate = 85;
    remaining = remaining.replace(/\breliable\b|\breliability\b/g, "");
  }

  // Score threshold: "700+"
  const scoreMatch = remaining.match(SCORE_REGEX);
  if (scoreMatch) {
    filters.minScore = parseInt(scoreMatch[1], 10);
    remaining = remaining.replace(SCORE_REGEX, "");
  }

  // Hours range: "5-10 h/week"
  const hoursMatch = remaining.match(HOURS_REGEX);
  if (hoursMatch) {
    filters.minHoursPerWeek = parseInt(hoursMatch[1], 10);
    filters.maxHoursPerWeek = parseInt(hoursMatch[2], 10);
    remaining = remaining.replace(HOURS_REGEX, "");
  }

  // Availability
  for (const [keyword, value] of Object.entries(AVAILABILITY_MAP)) {
    if (remaining.includes(keyword)) {
      filters.availability = value;
      remaining = remaining.replace(keyword, "");
      break;
    }
  }

  // Skills (multi-word first to avoid partial matches)
  const skills: string[] = [];
  const sortedSkills = Object.keys(SKILL_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedSkills) {
    if (remaining.includes(keyword)) {
      const mapped = SKILL_MAP[keyword];
      if (!skills.includes(mapped)) skills.push(mapped);
      remaining = remaining.replace(keyword, "");
    }
  }
  if (skills.length > 0) filters.skills = skills;

  // Stacks
  const stacks: string[] = [];
  const sortedStacks = Object.keys(STACK_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedStacks) {
    if (remaining.includes(keyword)) {
      const mapped = STACK_MAP[keyword];
      if (!stacks.includes(mapped)) stacks.push(mapped);
      remaining = remaining.replace(keyword, "");
    }
  }
  if (stacks.length > 0) filters.stacks = stacks;

  // Sort hints
  if (/\bbest\b|\btop\b|\bhighest score\b/.test(remaining)) {
    filters.sortBy = "score";
    remaining = remaining.replace(/\bbest\b|\btop\b|\bhighest score\b/g, "");
  }

  // Remaining text becomes free-text query
  const cleaned = remaining.replace(/[,\s]+/g, " ").trim();
  if (cleaned.length > 1) {
    filters.query = cleaned;
  }

  return filters;
}

export function parseProjectPrompt(prompt: string): ProjectFilters {
  const filters: ProjectFilters = {};
  let remaining = prompt.toLowerCase().trim();

  // Timeline: "8 weeks"
  const timelineMatch = remaining.match(TIMELINE_REGEX);
  if (timelineMatch) {
    filters.maxTimelineWeeks = parseInt(timelineMatch[1], 10);
    remaining = remaining.replace(TIMELINE_REGEX, "");
  }

  // Hours range
  const hoursMatch = remaining.match(HOURS_REGEX);
  if (hoursMatch) {
    filters.minHoursPerWeek = parseInt(hoursMatch[1], 10);
    filters.maxHoursPerWeek = parseInt(hoursMatch[2], 10);
    remaining = remaining.replace(HOURS_REGEX, "");
  }

  // Category
  const sortedCategories = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedCategories) {
    if (remaining.includes(keyword)) {
      filters.category = CATEGORY_MAP[keyword];
      remaining = remaining.replace(keyword, "");
      break;
    }
  }

  // Stage
  for (const [keyword, value] of Object.entries(STAGE_MAP)) {
    if (remaining.includes(keyword)) {
      filters.stage = value;
      remaining = remaining.replace(keyword, "");
      break;
    }
  }

  // Remaining text for FTS
  const cleaned = remaining.replace(/[,\s]+/g, " ").trim();
  if (cleaned.length > 1) {
    filters.ftsQuery = cleaned.split(/\s+/).join(" & ");
    filters.query = cleaned;
  }

  return filters;
}
