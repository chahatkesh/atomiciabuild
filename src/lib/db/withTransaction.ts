import mongoose from "mongoose";

import { connectDb } from "@/lib/db/connect";

export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  await connectDb();
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function probeTransactionSupport(): Promise<boolean> {
  try {
    await connectDb();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // No-op transaction to verify support.
      });
      return true;
    } finally {
      await session.endSession();
    }
  } catch {
    return false;
  }
}
