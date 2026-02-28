import { describe, it, expect } from "vitest";
import {
  extractGitHubSignals,
  extractDeliverySignals,
  mergeSignals,
  buildEvidenceSummary,
} from "../skill-signals";
import type { GitHubRepo } from "../skill-signals";
import type { Delivery } from "@/types";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "test-repo",
    description: null,
    language: null,
    languages: {},
    topics: [],
    has_dockerfile: false,
    has_ci: false,
    ...overrides,
  };
}

function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: "1",
    builder_id: "b1",
    project_id: null,
    title: "Test Delivery",
    description: "",
    role: "developer",
    stack: [],
    status: "completed",
    deployment_url: null,
    repo_url: null,
    started_at: null,
    completed_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("extractGitHubSignals", () => {
  it("detects backend repos by language", () => {
    const repos = [makeRepo({ name: "api-service", language: "Go" })];
    const signals = extractGitHubSignals(repos);
    expect(signals.backend).toContain("api-service");
  });

  it("detects frontend repos by topic", () => {
    const repos = [makeRepo({ name: "ui-app", topics: ["react", "nextjs"] })];
    const signals = extractGitHubSignals(repos);
    expect(signals.frontend).toContain("ui-app");
  });

  it("detects ML repos by pattern", () => {
    const repos = [
      makeRepo({ name: "ml-pipeline", language: "Python", topics: ["pytorch"] }),
    ];
    const signals = extractGitHubSignals(repos);
    expect(signals.ml).toContain("ml-pipeline");
  });

  it("detects DevOps via Dockerfile", () => {
    const repos = [makeRepo({ name: "infra", has_dockerfile: true })];
    const signals = extractGitHubSignals(repos);
    expect(signals.devops).toContain("infra");
  });

  it("detects Systems repos by pattern", () => {
    const repos = [
      makeRepo({ name: "distributed-cache", description: "A distributed cache system" }),
    ];
    const signals = extractGitHubSignals(repos);
    expect(signals.systems).toContain("distributed-cache");
  });

  it("returns empty arrays for generic repos", () => {
    const repos = [makeRepo({ name: "notes", language: "Text" })];
    const signals = extractGitHubSignals(repos);
    expect(signals.backend).toHaveLength(0);
    expect(signals.ml).toHaveLength(0);
    expect(signals.systems).toHaveLength(0);
  });
});

describe("extractDeliverySignals", () => {
  it("detects backend deliveries from stack", () => {
    const deliveries = [
      makeDelivery({ title: "REST API", stack: ["express", "postgres"] }),
    ];
    const signals = extractDeliverySignals(deliveries);
    expect(signals.backend).toContain("REST API");
  });

  it("detects frontend deliveries", () => {
    const deliveries = [
      makeDelivery({ title: "Dashboard UI", stack: ["react", "tailwind"] }),
    ];
    const signals = extractDeliverySignals(deliveries);
    expect(signals.frontend).toContain("Dashboard UI");
  });

  it("detects DevOps from deployment_url", () => {
    const deliveries = [
      makeDelivery({ title: "Landing Page", deployment_url: "https://example.com" }),
    ];
    const signals = extractDeliverySignals(deliveries);
    expect(signals.devops).toContain("Landing Page");
  });
});

describe("mergeSignals", () => {
  it("deduplicates across sources", () => {
    const a = { backend: ["api"], frontend: [], ml: [], systems: [], devops: [] };
    const b = { backend: ["api", "server"], frontend: ["ui"], ml: [], systems: [], devops: [] };
    const merged = mergeSignals(a, b);
    expect(merged.backend).toEqual(["api", "server"]);
    expect(merged.frontend).toEqual(["ui"]);
  });
});

describe("buildEvidenceSummary", () => {
  it("caps items at 8 per skill", () => {
    const signals = {
      backend: Array.from({ length: 15 }, (_, i) => `repo-${i}`),
      frontend: [],
      ml: [],
      systems: [],
      devops: [],
    };
    const evidence = buildEvidenceSummary(signals, 15, 3);
    expect(evidence.backend).toHaveLength(8);
    expect(evidence.github_repos_analyzed).toBe(15);
    expect(evidence.deliveries_analyzed).toBe(3);
  });
});
