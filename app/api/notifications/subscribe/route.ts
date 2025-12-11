import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { endpoint, keys } = subscribeSchema.parse(body);

    // Get user agent
    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert subscription (update if exists, create if not)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        isActive: true,
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        isActive: true,
      },
    });

    // Enable push notifications in user settings
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: { pushNotificationsEnabled: true },
      create: {
        userId: session.user.id,
        pushNotificationsEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        createdAt: subscription.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Subscribe error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid subscription data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}


