import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "manager" | "staff";
      profession?: "doctor" | "nurse" | "receptionist";
    } & DefaultSession["user"];
  }

  interface User {
    role: "manager" | "staff";
    profession?: "doctor" | "nurse" | "receptionist";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "manager" | "staff";
    profession?: "doctor" | "nurse" | "receptionist";
  }
}

export {};
