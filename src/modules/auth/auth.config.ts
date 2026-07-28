import type { NextAuthConfig } from "next-auth";

import { ROUTES } from "@/constants";

export const authConfig = {
  pages: {
    signIn: ROUTES.login,
    error: ROUTES.login,
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isAuthRoute = nextUrl.pathname.startsWith("/login");
      const isPublicRoute =
        nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname.startsWith("/api/health");

      if (isPublicRoute) {
        return true;
      }

      if (isAuthRoute) {
        return isLoggedIn ? Response.redirect(new URL(ROUTES.dashboard, nextUrl)) : true;
      }

      if (!isLoggedIn) {
        return false;
      }

      if (nextUrl.pathname.startsWith(ROUTES.imports) && auth?.user?.role !== "manager") {
        return Response.redirect(new URL(ROUTES.dashboard, nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.profession = user.profession;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role = token.role as "manager" | "staff";
        session.user.profession = token.profession as
          "doctor" | "nurse" | "receptionist" | undefined;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
