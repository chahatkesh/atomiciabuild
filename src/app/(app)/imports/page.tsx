import { ImportManager } from "@/components/imports";
import { requireManagerPage } from "@/modules/auth/server";

export default async function ImportsPage() {
  await requireManagerPage();

  return <ImportManager />;
}
