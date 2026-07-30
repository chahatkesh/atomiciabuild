import { readFile } from "node:fs/promises";
import path from "node:path";

import { disconnectDb, getEnv } from "../src/lib";
import { ClaimModel } from "../src/modules/claims/claim.model";
import { runImport, IMPORTED_STAFF_PASSWORD } from "../src/modules/imports/import.service";
import { ImportRunModel } from "../src/modules/imports/importRun.model";
import { hashPassword } from "../src/modules/auth/password";
import { ShiftModel } from "../src/modules/shifts/shift.model";
import { upsertUserByEmail } from "../src/modules/users/user.service";
import type { ImportSectionResult } from "../src/modules/imports/import.types";

const CSV_DIR = path.join(process.cwd(), "docs", "problem-statement");

const MANAGER = {
  email: "manager@clinicmail.test",
  fullName: "Alex Manager",
};

function printSection(section: ImportSectionResult): void {
  const { counts } = section;
  console.log(`\n${section.kind.toUpperCase()}`);
  console.log(`  rows read : ${counts.total}`);
  console.log(`  accepted  : ${counts.accepted}`);
  console.log(`  repaired  : ${counts.repaired}`);
  console.log(`  merged    : ${counts.merged}`);
  console.log(`  rejected  : ${counts.rejected}`);
  console.log(`  written   : ${section.persisted}`);

  const rejected = section.rows.filter((row) => row.verdict === "rejected");
  if (rejected.length > 0) {
    console.log(`  rejected rows:`);
    for (const row of rejected) {
      console.log(`    row ${row.rowNumber}: ${row.issues.join("; ")}`);
    }
  }
}

/**
 * Wipes shifts, claims and import history so the import can be demonstrated
 * from a known state. Staff accounts survive: the importer upserts them by
 * email, and dropping them would invalidate anyone's saved login.
 */
async function reset(): Promise<void> {
  const [shifts, claims, runs] = await Promise.all([
    ShiftModel.deleteMany({}),
    ClaimModel.deleteMany({}),
    ImportRunModel.deleteMany({}),
  ]);

  console.log(
    `Reset: removed ${shifts.deletedCount} shifts, ${claims.deletedCount} claims, ` +
      `${runs.deletedCount} import runs`,
  );
}

async function main(): Promise<void> {
  getEnv();

  const shouldReset = process.argv.includes("--reset");

  const passwordHash = await hashPassword(IMPORTED_STAFF_PASSWORD);
  await upsertUserByEmail({
    email: MANAGER.email,
    fullName: MANAGER.fullName,
    role: "manager",
    passwordHash,
  });
  console.log(`Manager account ready: ${MANAGER.email}`);

  if (shouldReset) {
    await reset();
  }

  const [staffCsv, shiftsCsv] = await Promise.all([
    readFile(path.join(CSV_DIR, "staff.csv"), "utf8"),
    readFile(path.join(CSV_DIR, "shifts.csv"), "utf8"),
  ]);

  const result = await runImport({
    source: "seed",
    files: [
      { fileName: "staff.csv", content: staffCsv, kind: "staff" },
      { fileName: "shifts.csv", content: shiftsCsv, kind: "shifts" },
    ],
  });

  result.sections.forEach(printSection);

  console.log(`\nImport run ${result.id}`);
  console.log(`Login password for every seeded account: ${IMPORTED_STAFF_PASSWORD}`);

  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
