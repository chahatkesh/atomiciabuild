import { redirect } from "next/navigation";

import { auth } from "@/modules/auth/auth";
import { AppError } from "@/lib/errors/AppError";
import type { Profession, UserRole } from "@/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profession?: Profession;
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: session.user.role,
    profession: session.user.profession,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    throw AppError.unauthorized();
  }
  return user;
}

export async function requireManager(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "manager") {
    throw AppError.forbidden("Manager access required");
  }
  return user;
}

export async function requireStaff(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "staff") {
    throw AppError.forbidden("Staff access required");
  }
  return user;
}

export async function requireUserPage(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireManagerPage(): Promise<AuthenticatedUser> {
  const user = await requireUserPage();
  if (user.role !== "manager") {
    redirect("/dashboard");
  }
  return user;
}
