import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { sendPushNotification } from "@/lib/notifications/push";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const result = await sendPushNotification(session.user.id, {
      title: "🔔 Test Notification",
      body: "Push notifications are working! You'll receive alerts for workflow errors.",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: "test-notification",
      data: {
        type: "test",
        url: "/settings",
      },
    });

    if (result.sent === 0 && result.failed === 0) {
      return NextResponse.json(
        { error: "No active push subscriptions found. Please enable notifications first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      message: `Test notification sent to ${result.sent} device(s)`,
    });
  } catch (error: any) {
    console.error("Test notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test notification" },
      { status: 500 }
    );
  }
}


