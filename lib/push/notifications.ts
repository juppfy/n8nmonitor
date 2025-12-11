import { prisma } from "@/lib/db/prisma";
import webpush from "web-push";

// Set VAPID keys (generate once: web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@n8n-monitor.dev";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
) {
  return await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removePushSubscription(endpoint: string) {
  return await prisma.pushSubscription.delete({
    where: { endpoint },
  }).catch(() => {
    // Ignore if subscription doesn't exist
  });
}

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    url?: string;
  }
) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { pushNotificationsEnabled: true },
  });

  if (!settings?.pushNotificationsEnabled) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || "/icons/icon-192x192.png",
    badge: notification.badge || "/icons/icon-96x96.png",
    data: {
      ...notification.data,
      url: notification.url || process.env.NEXT_PUBLIC_APP_URL || "/",
    },
  });

  const promises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      );
    } catch (error: any) {
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await removePushSubscription(subscription.endpoint);
      }
      console.error("Push notification error:", error);
    }
  });

  await Promise.allSettled(promises);
}

export async function sendExecutionFailureNotification(
  userId: string,
  execution: {
    workflowName: string;
    instanceName: string;
    executionId: string;
  }
) {
  await sendPushNotification(userId, {
    title: "Workflow Execution Failed",
    body: `${execution.workflowName} on ${execution.instanceName} has failed`,
    url: `/executions/${execution.executionId}`,
    data: {
      type: "execution_failure",
      executionId: execution.executionId,
    },
  });
}


