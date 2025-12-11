import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateNotificationSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  executionFailureAlerts: z.boolean().optional(),
  errorThreshold: z.number().int().min(1).max(20).optional(),
  autoDeactivateWorkflow: z.boolean().optional(),
  autoDeactivateThreshold: z.number().int().min(1).max(50).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireAuth();

    // Only admins can update user settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateNotificationSchema.parse(body);

    const settings = await prisma.userSettings.upsert({
      where: { userId: params.userId },
      update: data,
      create: {
        userId: params.userId,
        ...data,
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Update user notifications error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update user notifications" },
      { status: 500 }
    );
  }
}


