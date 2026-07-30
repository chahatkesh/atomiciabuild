import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Loads .env.local so integration tests can reach the same cluster the app
 * uses. They still run against a separate database (see tests/integration/db.ts).
 * Parsed by hand to avoid depending on a dotenv package just for tests.
 */
function loadEnvFile(file: string): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(path.resolve(__dirname, file), "utf8");
  } catch {
    return {};
  }

  const env: Record<string, string> = {};

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    env[key] = value.replace(/^(['"])(.*)\1$/, "$2");
  }

  return env;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    env: loadEnvFile(".env.local"),
    // Integration specs share one database; running files in parallel would
    // let them clear each other's fixtures mid-run.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
