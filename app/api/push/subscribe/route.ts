import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { savePushSubscription } from "@/lib/push/notifications";
import { z } from "zod";

const subscriptionSchema = z.object({
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
    const subscription = subscriptionSchema.parse(body);

    await savePushSubscription(session.user.id, subscription);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe push error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}


