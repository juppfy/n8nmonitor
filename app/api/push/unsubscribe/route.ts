import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { removePushSubscription } from "@/lib/push/notifications";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { endpoint } = schema.parse(body);

    await removePushSubscription(endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe push error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}


