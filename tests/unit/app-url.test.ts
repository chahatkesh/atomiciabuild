import { describe, expect, it } from "vitest";

import { APP_CANONICAL_URL } from "@/constants";
import { parseHttpUrl, resolveAppOrigin } from "@/lib/config/app-url";

describe("parseHttpUrl", () => {
  it("is null when there is nothing to parse", () => {
    expect(parseHttpUrl(undefined)).toBeNull();
    expect(parseHttpUrl("")).toBeNull();
    expect(parseHttpUrl("   ")).toBeNull();
  });

  it("keeps a well-formed URL as it is", () => {
    expect(parseHttpUrl("https://atomiciabuild.vercel.app")?.href).toBe(
      "https://atomiciabuild.vercel.app/",
    );
    expect(parseHttpUrl("http://localhost:3000")?.href).toBe("http://localhost:3000/");
  });

  it("assumes https for a bare host, which is all the Vercel URL vars give you", () => {
    expect(parseHttpUrl("atomiciabuild.vercel.app")?.origin).toBe(
      "https://atomiciabuild.vercel.app",
    );
  });

  /*
   * `new URL("localhost:3000")` does not throw — it parses as protocol
   * "localhost:" with a null origin. A schemeless host with a port would
   * otherwise pass validation and produce unusable absolute URLs.
   */
  it("treats a schemeless host:port as a host, not a scheme", () => {
    expect(parseHttpUrl("localhost:3000")?.origin).toBe("https://localhost:3000");
  });

  it("survives the ways a dashboard mangles a value", () => {
    expect(parseHttpUrl('"https://atomiciabuild.vercel.app"')?.origin).toBe(
      "https://atomiciabuild.vercel.app",
    );
    expect(parseHttpUrl("  https://atomiciabuild.vercel.app  ")?.origin).toBe(
      "https://atomiciabuild.vercel.app",
    );
  });

  it("preserves a path, since Auth.js accepts a mounted base path", () => {
    expect(parseHttpUrl("https://clinic.example.com/api/auth")?.href).toBe(
      "https://clinic.example.com/api/auth",
    );
  });

  it("is null for anything unparseable", () => {
    expect(parseHttpUrl("not a url")).toBeNull();
    expect(parseHttpUrl("https://")).toBeNull();
  });
});

describe("resolveAppOrigin", () => {
  it("prefers an explicit AUTH_URL", () => {
    expect(resolveAppOrigin({ AUTH_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
  });

  it("reduces a URL with a path to its origin", () => {
    expect(resolveAppOrigin({ AUTH_URL: "https://clinic.example.com/api/auth?x=1" })).toBe(
      "https://clinic.example.com",
    );
  });

  it("falls back through the Vercel-provided hosts", () => {
    expect(resolveAppOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "atomiciabuild.vercel.app" })).toBe(
      "https://atomiciabuild.vercel.app",
    );
    expect(resolveAppOrigin({ VERCEL_URL: "atomiciabuild-abc123.vercel.app" })).toBe(
      "https://atomiciabuild-abc123.vercel.app",
    );
  });

  it("falls back to the canonical origin when the environment offers nothing", () => {
    expect(resolveAppOrigin({})).toBe(APP_CANONICAL_URL);
  });

  /*
   * The regression this exists for: a schemeless AUTH_URL in the deploy
   * environment reached `new URL()` in the root layout, and `next build` failed
   * while collecting page data for /_not-found with ERR_INVALID_URL.
   */
  it("never throws on a value the platform cannot be trusted to format", () => {
    expect(resolveAppOrigin({ AUTH_URL: "atomiciabuild.vercel.app" })).toBe(
      "https://atomiciabuild.vercel.app",
    );
    expect(resolveAppOrigin({ AUTH_URL: "not a url" })).toBe(APP_CANONICAL_URL);
    expect(resolveAppOrigin({ AUTH_URL: "" })).toBe(APP_CANONICAL_URL);
    expect(resolveAppOrigin({ AUTH_URL: "https://", VERCEL_URL: "atomiciabuild.vercel.app" })).toBe(
      "https://atomiciabuild.vercel.app",
    );
  });
});
