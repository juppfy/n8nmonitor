import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/utils";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}


