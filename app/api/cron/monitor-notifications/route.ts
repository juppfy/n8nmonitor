import { NextResponse } from "next/server";
import { runNotificationMonitor } from "@/lib/services/notification-monitor";

/**
 * Cron job endpoint to monitor executions and send notifications
 * This should be called by a cron service (e.g., Vercel Cron, external cron job)
 * every 1-5 minutes
 * 
 * Example: curl -X POST https://your-app.com/api/cron/monitor-notifications
 * 
 * For Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/monitor-notifications",
 *     "schedule": "* /5 * * * *"
 *   }]
 * }
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    await runNotificationMonitor();

    return NextResponse.json({
      success: true,
      message: "Notification monitor completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run notification monitor" },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: Request) {
  return POST(request);
}


