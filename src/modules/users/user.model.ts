import { Schema, model, models } from "mongoose";

import type { Profession, UserRole } from "@/types";

export interface UserDocument {
  email: string;
  fullName: string;
  role: UserRole;
  profession?: Profession;
  passwordHash: string;
  legacyStaffId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["manager", "staff"],
      required: true,
    },
    profession: {
      type: String,
      enum: ["doctor", "nurse", "receptionist"],
      required: false,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    legacyStaffId: {
      type: String,
      required: false,
      index: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const UserModel = models.User ?? model<UserDocument>("User", userSchema);

export type UserEntity = UserDocument & { _id: Schema.Types.ObjectId; id: string };
