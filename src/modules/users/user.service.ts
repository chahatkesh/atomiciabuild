import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/modules/users/user.model";
import type { Profession, UserRole } from "@/types";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  profession?: Profession;
  passwordHash: string;
  legacyStaffId?: string;
}

function toPublicUser(user: {
  _id: { toString(): string };
  email: string;
  fullName: string;
  role: UserRole;
  profession?: Profession;
  passwordHash: string;
  legacyStaffId?: string;
}): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    profession: user.profession,
    passwordHash: user.passwordHash,
    legacyStaffId: user.legacyStaffId,
  };
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  await connectDb();
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  return user ? toPublicUser(user) : null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  await connectDb();
  const user = await UserModel.findById(id).lean();
  return user ? toPublicUser(user) : null;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  profession?: Profession;
  passwordHash: string;
  legacyStaffId?: string;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  await connectDb();
  const user = await UserModel.create({
    email: input.email.toLowerCase(),
    fullName: input.fullName,
    role: input.role,
    profession: input.profession,
    passwordHash: input.passwordHash,
    legacyStaffId: input.legacyStaffId,
  });

  return toPublicUser(user);
}

export async function upsertUserByEmail(input: CreateUserInput): Promise<PublicUser> {
  await connectDb();
  const user = await UserModel.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    {
      $set: {
        fullName: input.fullName,
        role: input.role,
        profession: input.profession,
        passwordHash: input.passwordHash,
        legacyStaffId: input.legacyStaffId,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return toPublicUser(user);
}

export async function listStaffUsers(): Promise<PublicUser[]> {
  await connectDb();
  const users = await UserModel.find({ role: "staff" }).sort({ fullName: 1 }).lean();
  return users.map(toPublicUser);
}

export async function countUsers(): Promise<number> {
  await connectDb();
  return UserModel.countDocuments();
}
