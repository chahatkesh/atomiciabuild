import { APP_CANONICAL_URL } from "@/constants";

/**
 * Parses a value that is meant to be an http(s) URL, tolerating the forms a
 * deploy platform actually hands you: a full URL, a bare host (`VERCEL_URL` and
 * `VERCEL_PROJECT_PRODUCTION_URL` never carry a scheme), or a value the
 * dashboard stored with its quotes. Returns null rather than throwing, so a
 * caller can fall back instead of taking the process down.
 */
export function parseHttpUrl(value: string | undefined | null): URL | null {
  const trimmed = value?.trim().replace(/^(['"])(.*)\1$/, "$2");
  if (!trimmed) {
    return null;
  }

  /*
   * The scheme has to be added before parsing rather than after a failed parse:
   * `new URL("localhost:3000")` succeeds with a "localhost:" protocol and a null
   * origin, so a schemeless host with a port would slip through looking valid.
   */
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/**
 * The origin absolute URLs are built from (`metadataBase`, OG tags).
 *
 * Deliberately total: metadata is evaluated while collecting page data, so
 * throwing here fails `next build` on every route rather than degrading one tag.
 * See DECISIONS.md §33.
 */
export function resolveAppOrigin(env: Record<string, string | undefined> = process.env): string {
  const resolved =
    parseHttpUrl(env.AUTH_URL) ??
    parseHttpUrl(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    parseHttpUrl(env.VERCEL_URL);

  return resolved?.origin ?? APP_CANONICAL_URL;
}
