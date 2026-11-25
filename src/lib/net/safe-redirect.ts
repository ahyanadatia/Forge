/**
 * Returns `path` only if it is a same-origin relative path, otherwise the
 * fallback. Stops `?redirect=` being used as an open redirect, e.g.
 * `@evil.com` (which would turn `${origin}${path}` into a userinfo URL),
 * `//evil.com` or `/\evil.com`.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(path)) return fallback;
  try {
    const url = new URL(path, "https://forge.invalid");
    if (url.origin !== "https://forge.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
