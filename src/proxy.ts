import { auth } from "@/modules/auth/server";

export default auth;

/**
 * Page routes only. Excluded on purpose:
 * - `/api/*` — handlers enforce access with requireUser()/requireManager() and
 *   must answer with a JSON 401/403 envelope rather than a login redirect.
 * - `opengraph-image` / `twitter-image` — file-based metadata routes that
 *   crawlers fetch unauthenticated; a login redirect yields HTML instead of PNG.
 * - static assets (`favicon.ico`, anything with a file extension).
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|.*\\..*).*)",
  ],
};
