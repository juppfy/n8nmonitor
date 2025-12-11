import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  notificationEmail: z.string().email().optional().or(z.literal("")),
  errorThreshold: z.number().int().min(1).max(20).optional(),
  autoDeactivateWorkflow: z.boolean().optional(),
  autoDeactivateThreshold: z.number().int().min(1).max(50).optional(),
  notifyOnSuccess: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  notifyOnWarning: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireAuth();

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ settings: settings || {} });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        ...data,
        notificationEmail: data.notificationEmail || null,
      },
      create: {
        userId: session.user.id,
        ...data,
        notificationEmail: data.notificationEmail || null,
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Update settings error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
