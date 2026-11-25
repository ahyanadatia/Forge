import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { parseGitHubRepo, probeDeployment } from "@/lib/scoring/probes";
import { isBlockedAddress } from "@/lib/net/safe-fetch";

describe("parseGitHubRepo", () => {
  it("parses ordinary repository URLs", () => {
    expect(parseGitHubRepo("https://github.com/ahyanadatia/Forge")).toEqual({ owner: "ahyanadatia", repo: "Forge" });
    expect(parseGitHubRepo("https://github.com/vercel/next.js.git")).toEqual({ owner: "vercel", repo: "next.js" });
    expect(parseGitHubRepo("https://github.com/a/b/tree/main/src")).toEqual({ owner: "a", repo: "b" });
  });

  it("rejects anything that is not a plain github.com repository", () => {
    for (const u of [
      "http://github.com/a/b",
      "https://github.com.evil.com/a/b",
      "https://evil.com/github.com/a/b",
      "https://github.com/a",
      "https://github.com/a/..",
      "https://github.com/a/b%2F..%2F..%2Fusers",
      "https://github.com/-bad/b",
      "not a url",
    ]) {
      expect(parseGitHubRepo(u), u).toBeNull();
    }
  });
});

describe("probeDeployment", () => {
  it("never connects to the cloud metadata address", async () => {
    const r = await probeDeployment("http://169.254.169.254/latest/meta-data/");
    expect(r.reachable).toBe(false);
    expect(r.error).toMatch(/^BLOCKED_ADDRESS/);
  });

  it("never connects to localhost by name", async () => {
    const r = await probeDeployment("http://localhost/");
    expect(r.reachable).toBe(false);
    expect(r.error).toMatch(/^BLOCKED_ADDRESS/);
  });

  describe("against a stand-in public server", () => {
    let server: http.Server;
    let port: number;
    beforeAll(async () => {
      server = http.createServer((req, res) => {
        if (req.url === "/verified") {
          res.writeHead(200, { "content-type": "text/html" });
          res.end('<meta name="forge-verify" content="t">');
        } else if (req.url === "/header") {
          res.writeHead(200, { "x-forge-verify": "t" });
          res.end("ok");
        } else {
          res.writeHead(500);
          res.end();
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
      port = (server.address() as AddressInfo).port;
    });
    afterAll(() => new Promise<void>((r) => server.close(() => r())));

    const opts = () => ({
      allowedPorts: [port],
      isBlocked: (a: string) => a !== "127.0.0.1" && isBlockedAddress(a),
      resolve: (h: string, cb: (e: NodeJS.ErrnoException | null, a: { address: string; family: number }[]) => void) =>
        h === "site.test" ? cb(null, [{ address: "127.0.0.1", family: 4 }]) : cb(new Error("ENOTFOUND"), []),
    });

    it("detects the verification token in the page", async () => {
      const r = await probeDeployment(`http://site.test:${port}/verified`, opts());
      expect(r).toMatchObject({ reachable: true, status_code: 200, has_forge_token: true, error: null });
    });

    it("detects the verification header", async () => {
      const r = await probeDeployment(`http://site.test:${port}/header`, opts());
      expect(r.has_forge_token).toBe(true);
    });

    it("reports a server error as unreachable", async () => {
      const r = await probeDeployment(`http://site.test:${port}/boom`, opts());
      expect(r).toMatchObject({ reachable: false, status_code: 500, has_forge_token: false });
    });
  });
});
