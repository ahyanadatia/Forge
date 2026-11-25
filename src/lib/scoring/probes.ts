/**
 * Verification Probes V3 — live probes that generate evidence.
 * Each probe produces a score_evidence row, not just a boolean.
 */

import { ingestEvidence, enqueueRecompute } from "./evidence";
import { safeFetch, SafeFetchError, type SafeFetchOptions } from "@/lib/net/safe-fetch";
import type { EvidenceType } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// ─── HTTP Deployment Probe ────────────────────────────────────────────────

export interface HttpProbeResult {
  reachable: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  has_forge_token: boolean;
  final_url: string | null;
  error: string | null;
}

/**
 * Probe a user-supplied deployment URL. The URL comes from the user, so it
 * goes through safeFetch: no private, loopback or link-local targets, even
 * via DNS or redirects. One GET (the body is needed for the token check),
 * capped at 512 KB.
 */
export async function probeDeployment(
  url: string,
  options: Pick<SafeFetchOptions, "resolve" | "isBlocked" | "allowedPorts"> = {}
): Promise<HttpProbeResult> {
  const start = Date.now();
  try {
    const res = await safeFetch(url, { timeoutMs: 10_000, maxBodyBytes: 512 * 1024, ...options });
    const ok = res.status >= 200 && res.status < 400;
    const hasForgeToken = (ok && res.body.includes("forge-verify")) || res.headers["x-forge-verify"] !== undefined;
    return {
      reachable: ok,
      status_code: res.status,
      response_time_ms: Date.now() - start,
      has_forge_token: hasForgeToken,
      final_url: res.url,
      error: null,
    };
  } catch (err) {
    return {
      reachable: false,
      status_code: null,
      response_time_ms: Date.now() - start,
      has_forge_token: false,
      final_url: null,
      error: err instanceof SafeFetchError ? `${err.code}: ${err.message}` : err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── GitHub Contributor Probe ─────────────────────────────────────────────

export interface GitHubContributorResult {
  is_contributor: boolean;
  commit_count: number;
  repo_exists: boolean;
  languages: Record<string, number>;
  has_ci: boolean;
  has_tests: boolean;
  has_dockerfile: boolean;
  error: string | null;
}

const GITHUB_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const GITHUB_REPO = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Parse owner/repo out of a GitHub URL. Only https://github.com/<owner>/<repo>
 * is accepted, and both parts must be valid GitHub names, so nothing a user
 * types can change the path of the API request built from them.
 */
export function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(repoUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname)) return null;
  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/, "");
  if (!owner || !repo || !GITHUB_NAME.test(owner) || !GITHUB_REPO.test(repo) || repo === "." || repo === "..") return null;
  return { owner, repo };
}

interface GitHubContributor { login?: string; contributions?: number }
interface GitHubContentEntry { name?: string }

const EMPTY_GH: Omit<GitHubContributorResult, "error"> = {
  is_contributor: false,
  commit_count: 0,
  repo_exists: false,
  languages: {},
  has_ci: false,
  has_tests: false,
  has_dockerfile: false,
};

export async function probeGitHubContributor(
  repoUrl: string,
  githubUsername: string,
  githubToken?: string
): Promise<GitHubContributorResult> {
  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) return { ...EMPTY_GH, error: "Invalid GitHub URL" };
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const headers: Record<string, string> = { "User-Agent": "ForgeVerifier/3.1", Accept: "application/vnd.github+json" };
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;
  const get = (path: string) => fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(10_000) });

  try {
    const repoRes = await get("");
    if (!repoRes.ok) return { ...EMPTY_GH, error: `Repo not found: ${repoRes.status}` };

    const [contribRes, langRes, contentsRes] = await Promise.all([
      get("/contributors?per_page=100"),
      get("/languages"),
      get("/contents"),
    ]);

    const contributors: GitHubContributor[] = contribRes.ok ? await contribRes.json() : [];
    const languages: Record<string, number> = langRes.ok ? await langRes.json() : {};
    const contents: unknown = contentsRes.ok ? await contentsRes.json() : [];

    const userContrib = contributors.find(
      (c) => c.login?.toLowerCase() === githubUsername.toLowerCase()
    );

    const fileNames = Array.isArray(contents)
      ? (contents as GitHubContentEntry[]).map((f) => f.name?.toLowerCase() ?? "")
      : [];
    const has_ci = fileNames.some((f) => f === ".github" || f === ".gitlab-ci.yml" || f === "jenkinsfile");
    const has_tests = fileNames.some((f) => f.includes("test") || f === "jest.config.js" || f === "vitest.config.ts" || f === "pytest.ini");
    const has_dockerfile = fileNames.some((f) => f === "dockerfile" || f === "docker-compose.yml");

    return {
      is_contributor: !!userContrib,
      commit_count: userContrib?.contributions ?? 0,
      repo_exists: true,
      languages,
      has_ci,
      has_tests,
      has_dockerfile,
      error: null,
    };
  } catch (err) {
    return { ...EMPTY_GH, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Stack Inference from Dependencies ────────────────────────────────────

export interface StackInferenceResult {
  detected_stack: string[];
  depth_flags: {
    has_auth: boolean;
    has_database: boolean;
    has_api: boolean;
    has_external_integrations: boolean;
    has_payments: boolean;
    has_background_jobs: boolean;
    has_testing: boolean;
    has_ci: boolean;
  };
  confidence: number;
}

const STACK_PATTERNS: Record<string, RegExp[]> = {
  auth: [/passport|next-auth|@auth|jsonwebtoken|bcrypt|jose|oauth|clerk|lucia/i],
  database: [/prisma|drizzle|typeorm|sequelize|knex|mongoose|@supabase|pg\b|mysql2|better-sqlite|redis|ioredis/i],
  api: [/express|fastify|hono|@trpc|graphql|@nestjs|koa/i],
  external_integrations: [/stripe|@sendgrid|twilio|@aws-sdk|@google-cloud|resend|postmark|pusher|@upstash/i],
  payments: [/stripe|@lemonsqueezy|paddle|paypal/i],
  background_jobs: [/bull|bullmq|celery|@temporalio|inngest|trigger\.dev|node-cron/i],
  testing: [/vitest|jest|@testing-library|playwright|cypress|mocha|pytest|unittest/i],
  ci: [/husky|lint-staged|@commitlint/i],
};

export function inferStackFromDependencies(deps: Record<string, string>): StackInferenceResult {
  const allDeps = Object.keys(deps).join(" ");
  const detected: string[] = [];
  const flags = {
    has_auth: false,
    has_database: false,
    has_api: false,
    has_external_integrations: false,
    has_payments: false,
    has_background_jobs: false,
    has_testing: false,
    has_ci: false,
  };

  for (const [key, patterns] of Object.entries(STACK_PATTERNS)) {
    for (const pat of patterns) {
      if (pat.test(allDeps)) {
        detected.push(key);
        const flagKey = `has_${key}` as keyof typeof flags;
        if (flagKey in flags) flags[flagKey] = true;
        break;
      }
    }
  }

  const confidence = Math.min(1, detected.length / 4);

  return { detected_stack: detected, depth_flags: flags, confidence };
}

// ─── Orchestrator: Run all probes and ingest evidence ────────────────────

export async function runProbesForDelivery(
  client: Client,
  builderId: string,
  deliveryId: string,
  delivery: {
    deployment_url?: string | null;
    repo_url?: string | null;
    project_id?: string | null;
  },
  githubUsername?: string | null,
  githubToken?: string
): Promise<{ evidenceIds: string[]; results: Record<string, unknown> }> {
  const evidenceIds: string[] = [];
  const results: Record<string, unknown> = {};

  // HTTP probe
  if (delivery.deployment_url) {
    const httpResult = await probeDeployment(delivery.deployment_url);
    results.http_probe = httpResult;

    const evidenceType: EvidenceType = httpResult.reachable
      ? "DEPLOYMENT_HTTP_PROBE_OK"
      : "DEPLOYMENT_HTTP_PROBE_FAIL";

    const ev = await ingestEvidence(client, {
      builder_id: builderId,
      delivery_id: deliveryId,
      project_id: delivery.project_id,
      type: evidenceType,
      source: "probe_http",
      payload: httpResult as unknown as Record<string, unknown>,
      confidence: httpResult.reachable ? (httpResult.has_forge_token ? 0.95 : 0.7) : 0.1,
    });
    if (ev) evidenceIds.push(ev.id);
  }

  // GitHub contributor probe
  if (delivery.repo_url && githubUsername) {
    const ghResult = await probeGitHubContributor(
      delivery.repo_url,
      githubUsername,
      githubToken
    );
    results.github_probe = ghResult;

    const ghType: EvidenceType = ghResult.is_contributor
      ? "GITHUB_CONTRIBUTOR_VERIFIED"
      : "GITHUB_CONTRIBUTOR_FAIL";

    const ev = await ingestEvidence(client, {
      builder_id: builderId,
      delivery_id: deliveryId,
      project_id: delivery.project_id,
      type: ghType,
      source: "probe_github",
      payload: ghResult as unknown as Record<string, unknown>,
      confidence: ghResult.is_contributor ? Math.min(0.95, 0.5 + ghResult.commit_count * 0.05) : 0.1,
    });
    if (ev) evidenceIds.push(ev.id);

    // Ownership strength
    const httpOk = (results.http_probe as HttpProbeResult | undefined)?.reachable ?? false;
    if (ghResult.is_contributor && httpOk) {
      const ownerEv = await ingestEvidence(client, {
        builder_id: builderId,
        delivery_id: deliveryId,
        project_id: delivery.project_id,
        type: "OWNERSHIP_VERIFIED_STRONG",
        source: "system",
        payload: { github_verified: true, deployment_reachable: true },
        confidence: 0.9,
      });
      if (ownerEv) evidenceIds.push(ownerEv.id);
    } else if (ghResult.is_contributor || httpOk) {
      const ownerEv = await ingestEvidence(client, {
        builder_id: builderId,
        delivery_id: deliveryId,
        project_id: delivery.project_id,
        type: "OWNERSHIP_VERIFIED_WEAK",
        source: "system",
        payload: {
          github_verified: ghResult.is_contributor,
          deployment_reachable: !!httpOk,
        },
        confidence: 0.5,
      });
      if (ownerEv) evidenceIds.push(ownerEv.id);
    }

    // Stack inference from repo languages + contents
    if (ghResult.repo_exists && Object.keys(ghResult.languages).length > 0) {
      const stackEv = await ingestEvidence(client, {
        builder_id: builderId,
        delivery_id: deliveryId,
        project_id: delivery.project_id,
        type: "REPO_STACK_INFERRED",
        source: "probe_github",
        payload: {
          languages: ghResult.languages,
          has_ci: ghResult.has_ci,
          has_tests: ghResult.has_tests,
          has_dockerfile: ghResult.has_dockerfile,
        },
        confidence: 0.7,
      });
      if (stackEv) evidenceIds.push(stackEv.id);
    }
  }

  // Enqueue recompute
  if (evidenceIds.length > 0) {
    await enqueueRecompute(client, builderId, "probe_result", evidenceIds[0]);
  }

  return { evidenceIds, results };
}
