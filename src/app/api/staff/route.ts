import { handleApiRoute, jsonSuccess } from "@/lib";
import { requireManager } from "@/modules/auth/server";
import { listStaffUsers } from "@/modules/users/user.service";

/** Staff directory for the manager's "assign someone" picker. */
export async function GET() {
  return handleApiRoute(async () => {
    await requireManager();

    const staff = await listStaffUsers();

    return jsonSuccess(
      staff.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        profession: user.profession,
      })),
    );
  });
}
