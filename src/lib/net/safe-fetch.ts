/**
 * safeFetch: fetch a user-supplied URL from the server without letting it
 * reach internal infrastructure (SSRF).
 *
 * Defences, in order:
 *  1. Only http/https, no credentials in the URL, only allowed ports.
 *  2. IP-literal hostnames are checked against the blocklist up front
 *     (the WHATWG URL parser already normalises forms like 0x7f.1 or
 *     2130706433 to 127.0.0.1, so they are caught here).
 *  3. Hostnames are resolved inside the socket's own `lookup` hook, and every
 *     resolved address is checked before the connection is opened. The
 *     address that is checked is the address that is connected to, so a DNS
 *     answer that changes between "check" and "connect" (DNS rebinding)
 *     cannot slip through.
 *  4. Redirects are never followed automatically: each Location is resolved
 *     against the current URL and goes through steps 1 to 3 again, up to
 *     `maxRedirects` hops.
 *  5. A total timeout and a cap on how much of the body is read.
 */

import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";

export class SafeFetchError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_URL"
      | "BLOCKED_PROTOCOL"
      | "BLOCKED_PORT"
      | "BLOCKED_CREDENTIALS"
      | "BLOCKED_ADDRESS"
      | "TOO_MANY_REDIRECTS"
      | "TIMEOUT"
      | "NETWORK"
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

// ─── Address policy ──────────────────────────────────────────────────────

const blocked = new BlockList();
// IPv4: "this network", private, CGNAT, loopback, link-local (incl. cloud
// metadata 169.254.169.254), IETF protocol assignments, documentation,
// benchmarking, multicast, reserved and broadcast.
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
// IPv6 (IPv4-mapped addresses are unwrapped and checked as IPv4): NAT64 (can embed private v4), discard,
// documentation, unique-local, link-local, site-local, multicast.
for (const [net, prefix] of [
  ["::", 96], // unspecified, loopback and deprecated IPv4-compatible
  ["::ffff:0:0:0", 96], // IPv4-translated (SIIT)
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** IPv4 embedded in an IPv4-mapped IPv6 address (::ffff:a.b.c.d or ::ffff:7f00:1). */
function embeddedIPv4(address: string): string | null {
  const lower = address.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/** True when the address must never be connected to from the server. */
export function isBlockedAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, "").split("%")[0];
  const family = isIP(bare);
  if (family === 4) return blocked.check(bare, "ipv4");
  if (family === 6) {
    const v4 = embeddedIPv4(bare);
    if (v4 !== null) return isIP(v4) !== 4 || blocked.check(v4, "ipv4");
    return blocked.check(bare, "ipv6");
  }
  return true; // not an IP at all: refuse rather than guess
}

// ─── Options ─────────────────────────────────────────────────────────────

type LookupAllFn = (
  hostname: string,
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
) => void;

export interface SafeFetchOptions {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  /** Total time budget across all redirect hops. */
  timeoutMs?: number;
  maxRedirects?: number;
  /** Stop reading the body after this many bytes (the response is marked truncated). */
  maxBodyBytes?: number;
  allowedPorts?: readonly number[];
  /** Injected for tests; defaults to the system resolver. */
  resolve?: LookupAllFn;
  /** Injected for tests; defaults to isBlockedAddress. */
  isBlocked?: (address: string) => boolean;
}

export interface SafeResponse {
  url: string;
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  truncated: boolean;
  redirects: number;
}

const DEFAULTS = {
  method: "GET" as const,
  timeoutMs: 10_000,
  maxRedirects: 3,
  maxBodyBytes: 512 * 1024,
  allowedPorts: [80, 443] as readonly number[],
};

const systemResolve: LookupAllFn = (hostname, cb) =>
  dnsLookup(hostname, { all: true, verbatim: true }, cb);

// ─── URL validation ──────────────────────────────────────────────────────

export function validateUrl(
  raw: string | URL,
  opts: Pick<SafeFetchOptions, "allowedPorts" | "isBlocked"> = {}
): URL {
  let url: URL;
  try {
    url = new URL(raw.toString());
  } catch {
    throw new SafeFetchError("Not a valid URL", "INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchError(`Protocol ${url.protocol} is not allowed`, "BLOCKED_PROTOCOL");
  }
  if (url.username || url.password) {
    throw new SafeFetchError("Credentials in URLs are not allowed", "BLOCKED_CREDENTIALS");
  }
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  const allowedPorts = opts.allowedPorts ?? DEFAULTS.allowedPorts;
  if (!allowedPorts.includes(port)) {
    throw new SafeFetchError(`Port ${port} is not allowed`, "BLOCKED_PORT");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && (opts.isBlocked ?? isBlockedAddress)(host)) {
    throw new SafeFetchError(`Address ${host} is not allowed`, "BLOCKED_ADDRESS");
  }
  return url;
}

// ─── One hop ─────────────────────────────────────────────────────────────

interface Hop {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  truncated: boolean;
}

function requestOnce(url: URL, o: Required<Omit<SafeFetchOptions, "headers">> & { headers: Record<string, string> }, signal: AbortSignal): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const guardedLookup = (
      hostname: string,
      options: { all?: boolean },
      cb: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
    ) => {
      o.resolve(hostname, (err, addresses) => {
        if (err) return cb(err, "", 4);
        if (addresses.length === 0) return cb(new SafeFetchError(`No address for ${hostname}`, "NETWORK"), "", 4);
        const bad = addresses.find((a) => o.isBlocked(a.address));
        if (bad) {
          return cb(new SafeFetchError(`${hostname} resolves to blocked address ${bad.address}`, "BLOCKED_ADDRESS"), "", 4);
        }
        if (options.all) return cb(null, addresses);
        cb(null, addresses[0].address, addresses[0].family);
      });
    };

    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: o.method,
        headers: { "user-agent": "ForgeVerifier/3.1", ...o.headers },
        lookup: guardedLookup as unknown as typeof dnsLookup,
        signal,
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const finish = () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
            truncated,
          });
        res.on("data", (chunk: Buffer) => {
          if (truncated) return;
          const room = o.maxBodyBytes - size;
          if (chunk.length > room) {
            chunks.push(chunk.subarray(0, room));
            size += room;
            truncated = true;
            res.destroy();
            finish();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        res.on("end", () => !truncated && finish());
        res.on("error", (e) => !truncated && reject(e));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function safeFetch(input: string | URL, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const o = {
    ...DEFAULTS,
    ...options,
    headers: options.headers ?? {},
    resolve: options.resolve ?? systemResolve,
    isBlocked: options.isBlocked ?? isBlockedAddress,
  };
  const signal = AbortSignal.timeout(o.timeoutMs);

  let url = validateUrl(input, o);
  for (let redirects = 0; ; redirects++) {
    let hop: Hop;
    try {
      hop = await requestOnce(url, o, signal);
    } catch (err) {
      if (err instanceof SafeFetchError) throw err;
      if (signal.aborted) throw new SafeFetchError(`Timed out after ${o.timeoutMs} ms`, "TIMEOUT");
      throw new SafeFetchError((err as Error).message ?? "Network error", "NETWORK");
    }

    const location = hop.headers.location;
    if (hop.status >= 300 && hop.status < 400 && typeof location === "string") {
      if (redirects >= o.maxRedirects) {
        throw new SafeFetchError(`More than ${o.maxRedirects} redirects`, "TOO_MANY_REDIRECTS");
      }
      url = validateUrl(new URL(location, url), o);
      continue;
    }
    return { url: url.toString(), status: hop.status, headers: hop.headers, body: hop.body, truncated: hop.truncated, redirects };
  }
}
