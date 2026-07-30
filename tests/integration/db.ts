import mongoose from "mongoose";

import { ClaimModel } from "@/modules/claims/claim.model";
import { ImportRunModel } from "@/modules/imports/importRun.model";
import { ShiftModel } from "@/modules/shifts/shift.model";
import { UserModel } from "@/modules/users/user.model";

/**
 * Integration tests never touch the application database. The connection URI is
 * reused, but the database name is replaced, so a test run cannot wipe seeded
 * data even if someone points MONGODB_URI at a live cluster.
 */
const TEST_DB_NAME = "clinic_scheduler_integration_test";

const PLACEHOLDER_HOSTS = ["127.0.0.1", "localhost"];

function resolveUri(): string | null {
  const base = process.env.MONGODB_URI_TEST ?? process.env.MONGODB_URI;

  if (!base) {
    return null;
  }

  // tests/setup.ts falls back to a local replica set that usually is not
  // running; skip rather than hang when that is all we have.
  if (!process.env.MONGODB_URI_TEST && PLACEHOLDER_HOSTS.some((host) => base.includes(host))) {
    return null;
  }

  return base;
}

export const integrationUri = resolveUri();

/** Specs use `describe.skipIf(!hasIntegrationDb)` so CI stays green without a cluster. */
export const hasIntegrationDb = integrationUri !== null;

export async function connectTestDb(): Promise<void> {
  if (!integrationUri) {
    throw new Error("No integration database configured");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  const conn = await mongoose.connect(integrationUri, {
    dbName: TEST_DB_NAME,
    bufferCommands: false,
  });

  // Services call connectDb(); priming its cache points them at this database.
  globalThis.mongooseCache = { conn, promise: Promise.resolve(conn) };

  await Promise.all([
    UserModel.init(),
    ShiftModel.init(),
    ClaimModel.init(),
    ImportRunModel.init(),
  ]);
}

export async function clearTestDb(): Promise<void> {
  await Promise.all([
    UserModel.deleteMany({}),
    ShiftModel.deleteMany({}),
    ClaimModel.deleteMany({}),
    ImportRunModel.deleteMany({}),
  ]);
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect();
  globalThis.mongooseCache = { conn: null, promise: null };
}
