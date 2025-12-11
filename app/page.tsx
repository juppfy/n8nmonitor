import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Check if admin exists (Setup check)
  // We use findFirst with select for performance
  const adminExists = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!adminExists) {
    redirect("/setup");
  }

  // 2. Check if user is logged in
  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  // 3. If setup is done but not logged in -> Login
  redirect("/login");
}
