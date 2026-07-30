import { auth } from "@/modules/auth/server";

export default auth;

/**
 * Page routes only. API routes are deliberately excluded: they enforce access
 * with requireUser()/requireManager() and must answer with a JSON 401/403
 * envelope rather than a redirect to the login page.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
