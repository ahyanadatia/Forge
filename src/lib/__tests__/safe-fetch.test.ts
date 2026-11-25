import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { LookupAddress } from "node:dns";
import { isBlockedAddress, safeFetch, SafeFetchError, validateUrl } from "@/lib/net/safe-fetch";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1", // IPv4-mapped, hex form
    "::ffff:a9fe:a9fe", // ::ffff:169.254.169.254
    "64:ff9b::a00:1", // NAT64
    "not-an-ip",
  ])("blocks %s", (addr) => {
    expect(isBlockedAddress(addr)).toBe(true);
  });

  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows public address %s",
    (addr) => {
      expect(isBlockedAddress(addr)).toBe(false);
    }
  );
});

describe("validateUrl", () => {
  const code = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return (e as SafeFetchError).code;
    }
    return "OK";
  };

  it("accepts ordinary public URLs", () => {
    expect(code(() => validateUrl("https://example.com/path?q=1"))).toBe("OK");
    expect(code(() => validateUrl("http://example.com:80/"))).toBe("OK");
  });

  it("rejects non-http protocols", () => {
    expect(code(() => validateUrl("file:///etc/passwd"))).toBe("BLOCKED_PROTOCOL");
    expect(code(() => validateUrl("gopher://example.com"))).toBe("BLOCKED_PROTOCOL");
  });

  it("rejects credentials and unusual ports", () => {
    expect(code(() => validateUrl("https://user:pw@example.com"))).toBe("BLOCKED_CREDENTIALS");
    expect(code(() => validateUrl("http://example.com:6379"))).toBe("BLOCKED_PORT");
  });

  it("rejects IP literals in blocked ranges, including obfuscated forms", () => {
    for (const u of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://2130706433/", // decimal 127.0.0.1
      "http://0x7f.1/", // hex/short form
      "http://0177.0.0.1/", // octal
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:a9fe:a9fe]/",
    ]) {
      expect(code(() => validateUrl(u)), u).toBe("BLOCKED_ADDRESS");
    }
  });

  it("rejects garbage", () => {
    expect(code(() => validateUrl("not a url"))).toBe("INVALID_URL");
  });
});

// A fake resolver: maps test hostnames to fixed addresses.
function fakeResolve(table: Record<string, string[]>) {
  return (host: string, cb: (err: NodeJS.ErrnoException | null, a: LookupAddress[]) => void) => {
    const addrs = table[host];
    if (!addrs) return cb(Object.assign(new Error(`ENOTFOUND ${host}`), { code: "ENOTFOUND" }), []);
    cb(
      null,
      addrs.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }))
    );
  };
}

describe("safeFetch against a local server", () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end('<meta name="forge-verify" content="abc">');
      } else if (req.url === "/to-ok") {
        res.writeHead(302, { location: "/ok" });
        res.end();
      } else if (req.url === "/to-metadata") {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
      } else if (req.url === "/to-internal-name") {
        res.writeHead(301, { location: `http://internal.test:${port}/ok` });
        res.end();
      } else if (req.url === "/loop") {
        res.writeHead(302, { location: "/loop" });
        res.end();
      } else if (req.url === "/big") {
        res.writeHead(200);
        res.end("x".repeat(10_000));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  // Policy for these tests: the loopback test server stands in for a public
  // host, everything else follows the real policy.
  const opts = () => ({
    allowedPorts: [port],
    isBlocked: (a: string) => a !== "127.0.0.1" && isBlockedAddress(a),
    resolve: fakeResolve({
      "public.test": ["127.0.0.1"],
      "internal.test": ["10.0.0.5"],
      "mixed.test": ["127.0.0.1", "192.168.0.10"],
    }),
  });

  it("fetches an allowed host and returns the body", async () => {
    const res = await safeFetch(`http://public.test:${port}/ok`, opts());
    expect(res.status).toBe(200);
    expect(res.body).toContain("forge-verify");
    expect(res.redirects).toBe(0);
  });

  it("follows a safe redirect and reports the final URL", async () => {
    const res = await safeFetch(`http://public.test:${port}/to-ok`, opts());
    expect(res.status).toBe(200);
    expect(res.redirects).toBe(1);
    expect(res.url).toBe(`http://public.test:${port}/ok`);
  });

  it("refuses a redirect to the cloud metadata address", async () => {
    await expect(safeFetch(`http://public.test:${port}/to-metadata`, opts())).rejects.toMatchObject({
      code: "BLOCKED_PORT", // port 80 is not in this test's allowlist, which is checked first
    });
    await expect(
      safeFetch(`http://public.test:${port}/to-metadata`, { ...opts(), allowedPorts: [port, 80] })
    ).rejects.toMatchObject({ code: "BLOCKED_ADDRESS" });
  });

  it("refuses a redirect to a hostname that resolves to a private address", async () => {
    await expect(safeFetch(`http://public.test:${port}/to-internal-name`, opts())).rejects.toMatchObject({
      code: "BLOCKED_ADDRESS",
    });
  });

  it("refuses a hostname when any of its addresses is private", async () => {
    await expect(safeFetch(`http://mixed.test:${port}/ok`, opts())).rejects.toMatchObject({
      code: "BLOCKED_ADDRESS",
    });
  });

  it("stops after maxRedirects", async () => {
    await expect(safeFetch(`http://public.test:${port}/loop`, { ...opts(), maxRedirects: 2 })).rejects.toMatchObject({
      code: "TOO_MANY_REDIRECTS",
    });
  });

  it("caps how much of the body it reads", async () => {
    const res = await safeFetch(`http://public.test:${port}/big`, { ...opts(), maxBodyBytes: 100 });
    expect(res.body.length).toBe(100);
    expect(res.truncated).toBe(true);
  });

  it("maps unknown hosts to a network error", async () => {
    await expect(safeFetch(`http://nowhere.test:${port}/`, opts())).rejects.toBeInstanceOf(SafeFetchError);
  });

  it("blocks loopback under the default policy", async () => {
    await expect(
      safeFetch(`http://public.test:${port}/ok`, { ...opts(), isBlocked: isBlockedAddress })
    ).rejects.toMatchObject({ code: "BLOCKED_ADDRESS" });
  });
});
