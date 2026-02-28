import type { Delivery, SkillEvidence } from "@/types";

// ─── Signal Extraction Types ────────────────────────────────────────────────

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  has_dockerfile: boolean;
  has_ci: boolean;
}

export interface SkillSignals {
  backend: string[];
  frontend: string[];
  ml: string[];
  systems: string[];
  devops: string[];
}

// ─── Language / Topic → Skill Mappings ──────────────────────────────────────

const BACKEND_LANGUAGES = new Set([
  "go", "rust", "java", "kotlin", "python", "ruby", "php",
  "c#", "elixir", "scala",
]);

const BACKEND_PATTERNS = [
  "express", "fastapi", "django", "flask", "rails", "spring",
  "nestjs", "koa", "hapi", "gin", "fiber", "actix", "graphql",
  "rest", "api", "grpc", "prisma", "sequelize", "typeorm",
  "drizzle", "knex", "database", "postgres", "mysql", "redis",
  "mongodb", "supabase", "firebase",
];

const FRONTEND_PATTERNS = [
  "react", "next", "nextjs", "vue", "nuxt", "svelte", "angular",
  "gatsby", "remix", "astro", "tailwind", "css", "ui", "web",
  "component", "storybook", "shadcn",
];

const ML_LANGUAGES = new Set(["python", "r", "julia"]);

const ML_PATTERNS = [
  "tensorflow", "pytorch", "keras", "scikit", "sklearn",
  "huggingface", "transformers", "llm", "ml", "ai", "machine-learning",
  "deep-learning", "neural", "nlp", "cv", "computer-vision",
  "model", "training", "notebook", "jupyter", "pandas", "numpy",
  "data-science", "langchain", "openai",
];

const SYSTEMS_PATTERNS = [
  "distributed", "microservice", "architecture", "protocol",
  "compiler", "operating-system", "kernel", "network",
  "queue", "kafka", "rabbitmq", "cache", "load-balancer",
  "proxy", "gateway", "multi-service", "monorepo",
];

const DEVOPS_PATTERNS = [
  "docker", "kubernetes", "k8s", "terraform", "ansible", "helm",
  "ci", "cd", "pipeline", "github-actions", "gitlab-ci",
  "jenkins", "deployment", "infra", "infrastructure", "aws",
  "gcp", "azure", "vercel", "netlify", "cloudflare", "nginx",
  "monitoring", "grafana", "prometheus",
];

// ─── GitHub Signal Extraction ───────────────────────────────────────────────

export function extractGitHubSignals(repos: GitHubRepo[]): SkillSignals {
  const signals: SkillSignals = {
    backend: [], frontend: [], ml: [], systems: [], devops: [],
  };

  for (const repo of repos) {
    const text = [
      repo.name,
      repo.description,
      ...(repo.topics ?? []),
      ...(Object.keys(repo.languages ?? {})),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const lang = (repo.language ?? "").toLowerCase();
    const langKeys = Object.keys(repo.languages ?? {}).map((l) => l.toLowerCase());

    if (
      BACKEND_LANGUAGES.has(lang) ||
      langKeys.some((l) => BACKEND_LANGUAGES.has(l)) ||
      BACKEND_PATTERNS.some((p) => text.includes(p))
    ) {
      signals.backend.push(repo.name);
    }

    if (
      lang === "typescript" || lang === "javascript" ||
      langKeys.includes("typescript") || langKeys.includes("javascript") ||
      FRONTEND_PATTERNS.some((p) => text.includes(p))
    ) {
      signals.frontend.push(repo.name);
    }

    if (
      ML_LANGUAGES.has(lang) && ML_PATTERNS.some((p) => text.includes(p)) ||
      ML_PATTERNS.some((p) => text.includes(p))
    ) {
      signals.ml.push(repo.name);
    }

    if (SYSTEMS_PATTERNS.some((p) => text.includes(p))) {
      signals.systems.push(repo.name);
    }

    if (
      repo.has_dockerfile ||
      repo.has_ci ||
      DEVOPS_PATTERNS.some((p) => text.includes(p))
    ) {
      signals.devops.push(repo.name);
    }
  }

  return signals;
}

// ─── Delivery Signal Extraction ─────────────────────────────────────────────

export function extractDeliverySignals(deliveries: Delivery[]): SkillSignals {
  const signals: SkillSignals = {
    backend: [], frontend: [], ml: [], systems: [], devops: [],
  };

  for (const d of deliveries) {
    const text = [
      d.title,
      d.description,
      d.role,
      ...(d.stack ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (BACKEND_PATTERNS.some((p) => text.includes(p))) {
      signals.backend.push(d.title);
    }

    if (FRONTEND_PATTERNS.some((p) => text.includes(p))) {
      signals.frontend.push(d.title);
    }

    if (ML_PATTERNS.some((p) => text.includes(p))) {
      signals.ml.push(d.title);
    }

    if (SYSTEMS_PATTERNS.some((p) => text.includes(p))) {
      signals.systems.push(d.title);
    }

    if (
      d.deployment_url ||
      DEVOPS_PATTERNS.some((p) => text.includes(p))
    ) {
      signals.devops.push(d.title);
    }
  }

  return signals;
}

// ─── Merge Signals ──────────────────────────────────────────────────────────

export function mergeSignals(a: SkillSignals, b: SkillSignals): SkillSignals {
  return {
    backend: [...new Set([...a.backend, ...b.backend])],
    frontend: [...new Set([...a.frontend, ...b.frontend])],
    ml: [...new Set([...a.ml, ...b.ml])],
    systems: [...new Set([...a.systems, ...b.systems])],
    devops: [...new Set([...a.devops, ...b.devops])],
  };
}

// ─── Build Evidence Summary ─────────────────────────────────────────────────

export function buildEvidenceSummary(
  signals: SkillSignals,
  repoCount: number,
  deliveryCount: number
): SkillEvidence {
  return {
    backend: signals.backend.slice(0, 8),
    frontend: signals.frontend.slice(0, 8),
    ml: signals.ml.slice(0, 8),
    systems: signals.systems.slice(0, 8),
    devops: signals.devops.slice(0, 8),
    github_repos_analyzed: repoCount,
    deliveries_analyzed: deliveryCount,
  };
}
