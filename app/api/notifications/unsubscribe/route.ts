import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { endpoint } = unsubscribeSchema.parse(body);

    // Deactivate the subscription
    await prisma.pushSubscription.updateMany({
      where: {
        userId: session.user.id,
        endpoint,
      },
      data: {
        isActive: false,
      },
    });

    // Check if user has any other active subscriptions
    const activeSubscriptions = await prisma.pushSubscription.count({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    // If no active subscriptions, disable push notifications in settings
    if (activeSubscriptions === 0) {
      await prisma.userSettings.updateMany({
        where: { userId: session.user.id },
        data: { pushNotificationsEnabled: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Unsubscribed from push notifications",
    });
  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}


