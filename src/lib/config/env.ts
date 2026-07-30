import { z } from "zod";

import { DEFAULT_CLINIC_TIMEZONE } from "@/constants";
import { parseHttpUrl } from "@/lib/config/app-url";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  // Repaired rather than rejected: nothing here reads AUTH_URL (Auth.js reads
  // process.env itself), so a schemeless value must not fail every request that
  // touches getEnv() — which is every request.
  AUTH_URL: z
    .string()
    .optional()
    .transform((value) => parseHttpUrl(value)?.toString()),
  AUTH_TRUST_HOST: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  CLINIC_TIMEZONE: z.string().default(DEFAULT_CLINIC_TIMEZONE),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
