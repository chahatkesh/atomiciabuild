import mongoose from "mongoose";

import { getEnv } from "@/lib/config/env";

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis.mongooseCache = globalCache;

export async function connectDb(): Promise<typeof mongoose> {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  const { MONGODB_URI } = getEnv();

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

export async function disconnectDb(): Promise<void> {
  if (globalCache.conn) {
    await mongoose.disconnect();
    globalCache.conn = null;
    globalCache.promise = null;
  }
}

export async function pingDb(): Promise<boolean> {
  try {
    const connection = await connectDb();
    await connection.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
