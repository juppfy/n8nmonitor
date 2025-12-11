import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();

    // Only admins can view all users
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        userSettings: {
          select: {
            emailNotificationsEnabled: true,
            pushNotificationsEnabled: true,
            executionFailureAlerts: true,
            errorThreshold: true,
            autoDeactivateWorkflow: true,
            autoDeactivateThreshold: true,
          },
        },
        _count: {
          select: {
            n8nInstances: true,
            pushSubscriptions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}


