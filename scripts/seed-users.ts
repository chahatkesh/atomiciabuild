import { hashPassword } from "../src/modules/auth/password";
import { disconnectDb, getEnv } from "../src/lib";
import { countUsers, upsertUserByEmail } from "../src/modules/users/user.service";

const DEFAULT_PASSWORD = "Clinic123!";

const seedUsers = [
  {
    email: "manager@clinicmail.test",
    fullName: "Alex Manager",
    role: "manager" as const,
  },
  {
    email: "marcus.whitfield@clinicmail.test",
    fullName: "Marcus Whitfield",
    role: "staff" as const,
    profession: "doctor" as const,
    legacyStaffId: "121",
  },
  {
    email: "anya.haddad@clinicmail.test",
    fullName: "Anya Haddad",
    role: "staff" as const,
    profession: "nurse" as const,
    legacyStaffId: "131",
  },
  {
    email: "ben.marchand@clinicmail.test",
    fullName: "Ben Marchand",
    role: "staff" as const,
    profession: "receptionist" as const,
    legacyStaffId: "120",
  },
];

async function main(): Promise<void> {
  getEnv();
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const user of seedUsers) {
    await upsertUserByEmail({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      profession: "profession" in user ? user.profession : undefined,
      passwordHash,
      legacyStaffId: "legacyStaffId" in user ? user.legacyStaffId : undefined,
    });
    console.log(`Seeded ${user.role}: ${user.email}`);
  }

  const total = await countUsers();
  console.log(`Total users in database: ${total}`);
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);

  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
