import { handleApiRoute, jsonSuccess, pingDb, probeTransactionSupport } from "@/lib";
import type { HealthResponse } from "@/types";

export async function GET() {
  return handleApiRoute(async () => {
    const connected = await pingDb();
    const transactionsSupported = connected ? await probeTransactionSupport() : false;

    const payload: HealthResponse = {
      status: connected ? "ok" : "degraded",
      mongo: {
        connected,
        transactionsSupported,
      },
      timestamp: new Date().toISOString(),
    };

    return jsonSuccess(payload, connected ? 200 : 503);
  });
}
