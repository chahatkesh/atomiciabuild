import { handleApiRoute, jsonSuccess } from "@/lib";
import { requireUser } from "@/modules/auth/server";
import { listMyShifts } from "@/modules/claims";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireUser();
    return jsonSuccess(await listMyShifts(user.id));
  });
}
