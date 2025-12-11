import { getSession } from "@/lib/auth/utils";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="container mx-auto py-8">
      <InstallPrompt />
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to n8n Monitor, {session?.user?.name || session?.user?.email}!
      </p>
      <DashboardOverview />
    </div>
  );
}


