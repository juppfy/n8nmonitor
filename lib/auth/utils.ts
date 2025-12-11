import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  // Fetch user role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  // Add role to session
  return {
    ...session,
    user: {
      ...session.user,
      role: user?.role || "USER",
    },
  };
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  return session;
}

