import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all active push subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions found for user: ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );

          return { success: true };
        } catch (error: any) {
          console.error(`Failed to send push notification:`, error);

          // If subscription is no longer valid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false },
            });
          }

          return { success: false };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    return { sent, failed };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return { sent: 0, failed: 0 };
  }
}

export async function sendExecutionErrorNotification(
  userId: string,
  data: {
    workflowName: string;
    instanceName: string;
    executionId: string;
    errorMessage: string;
    consecutiveErrors: number;
  }
) {
  const payload: PushNotificationPayload = {
    title: `❌ Workflow Error: ${data.workflowName}`,
    body: `${data.errorMessage}\n${data.consecutiveErrors > 1 ? `(${data.consecutiveErrors} consecutive errors)` : ""}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: `execution-error-${data.executionId}`,
    requireInteraction: true,
    data: {
      type: "execution-error",
      executionId: data.executionId,
      url: `/executions/${data.executionId}`,
    },
  };

  return sendPushNotification(userId, payload);
}

export async function sendWorkflowDeactivatedNotification(
  userId: string,
  data: {
    workflowName: string;
    instanceName: string;
    workflowId: string;
    reason: string;
  }
) {
  const payload: PushNotificationPayload = {
    title: `🔴 Workflow Auto-Deactivated`,
    body: `${data.workflowName} on ${data.instanceName}\nReason: ${data.reason}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: `workflow-deactivated-${data.workflowId}`,
    requireInteraction: true,
    data: {
      type: "workflow-deactivated",
      workflowId: data.workflowId,
      url: `/workflows/${data.workflowId}`,
    },
  };

  return sendPushNotification(userId, payload);
}


