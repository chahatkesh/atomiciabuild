import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { parseHttpUrl } from "@/lib/config/app-url";
import { authConfig } from "@/modules/auth/auth.config";
import { loginSchema } from "@/modules/auth/schemas";
import { verifyPassword } from "@/modules/auth/password";
import { findUserByEmail } from "@/modules/users/user.service";

/*
 * next-auth re-reads these from process.env on every request and calls
 * `new URL()` on the value without a guard (`reqWithEnvURL`), so a host stored
 * without its scheme answers every route — the proxy included — with a 500.
 * This module is what both the proxy and the auth route import, so repairing the
 * value here happens before any request can read it. An unusable value is
 * dropped rather than kept: `trustHost` makes the request headers a correct
 * fallback, which is what Vercel wants anyway.
 */
for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
  const configured = process.env[key];
  if (!configured) {
    continue;
  }

  const repaired = parseHttpUrl(configured);
  if (repaired) {
    process.env[key] = repaired.toString();
  } else {
    delete process.env[key];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email.toLowerCase());
        if (!user) {
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          profession: user.profession,
        };
      },
    }),
  ],
});
