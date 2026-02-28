import type { GitHubRepo } from "./skill-signals";

const GITHUB_API = "https://api.github.com";

/**
 * Fetches public repos for a GitHub user.
 * Returns normalized repo data for signal extraction.
 */
export async function fetchUserRepos(
  username: string,
  maxRepos = 50
): Promise<GitHubRepo[]> {
  const url = `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=${maxRepos}&sort=updated&type=owner`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "forge-skill-analyzer",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`GitHub API returned ${res.status}`);
  }

  const repos: any[] = await res.json();

  const enriched = await Promise.allSettled(
    repos.slice(0, maxRepos).map(async (repo) => {
      const [languages, contents] = await Promise.allSettled([
        fetchRepoLanguages(repo.full_name, headers),
        fetchRepoRoot(repo.full_name, headers),
      ]);

      const langData =
        languages.status === "fulfilled" ? languages.value : {};
      const rootFiles =
        contents.status === "fulfilled" ? contents.value : [];

      return {
        name: repo.name,
        description: repo.description,
        language: repo.language,
        languages: langData,
        topics: repo.topics ?? [],
        has_dockerfile: rootFiles.some(
          (f: string) =>
            f.toLowerCase() === "dockerfile" ||
            f.toLowerCase() === "docker-compose.yml" ||
            f.toLowerCase() === "docker-compose.yaml"
        ),
        has_ci: rootFiles.some(
          (f: string) =>
            f === ".github" ||
            f === ".gitlab-ci.yml" ||
            f === "Jenkinsfile" ||
            f === ".circleci"
        ),
      } satisfies GitHubRepo;
    })
  );

  return enriched
    .filter((r): r is PromiseFulfilledResult<GitHubRepo> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function fetchRepoLanguages(
  fullName: string,
  headers: Record<string, string>
): Promise<Record<string, number>> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/languages`, {
    headers,
  });
  if (!res.ok) return {};
  return res.json();
}

async function fetchRepoRoot(
  fullName: string,
  headers: Record<string, string>
): Promise<string[]> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/contents`, {
    headers,
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => item.name);
}
