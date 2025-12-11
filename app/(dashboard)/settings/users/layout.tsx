import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/utils";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}


