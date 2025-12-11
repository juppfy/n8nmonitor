import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/utils";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={session.user.role} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}


