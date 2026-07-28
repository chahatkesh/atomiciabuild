import { disconnectDb, getEnv, pingDb, probeTransactionSupport } from "../src/lib";

async function main(): Promise<void> {
  getEnv();

  const connected = await pingDb();
  if (!connected) {
    console.error("MongoDB connection failed.");
    process.exit(1);
  }

  const transactionsSupported = await probeTransactionSupport();
  console.log(`MongoDB connected: ${connected}`);
  console.log(`Transactions supported: ${transactionsSupported}`);

  if (!transactionsSupported) {
    console.warn(
      "Warning: multi-document transactions are not available. Claim concurrency guarantees require a replica set.",
    );
    process.exit(1);
  }

  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
