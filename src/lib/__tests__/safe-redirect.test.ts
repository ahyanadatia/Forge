import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/net/safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/projects/abc?tab=roles#x")).toBe("/projects/abc?tab=roles#x");
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
  });

  it.each(["@evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "/\tevil", ""])(
    "rejects %j",
    (input) => {
      expect(safeRedirectPath(input)).toBe("/dashboard");
    }
  );

  it("uses the fallback for null", () => {
    expect(safeRedirectPath(null, "/onboarding")).toBe("/onboarding");
  });
});
