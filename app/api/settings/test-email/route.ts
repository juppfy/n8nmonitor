import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { getResendClient } from "@/lib/email/resend";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { email } = schema.parse(body);

    const resend = await getResendClient(session.user.id);
    if (!resend) {
      return NextResponse.json(
        { error: "Resend is not configured. Please add your API key in settings." },
        { status: 400 }
      );
    }

    // Get user's from email or use default
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { resendFromEmail: true },
    });

    const fromEmail = settings?.resendFromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Test Email from n8n Monitor",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
                background-color: #ffffff;
              }
              .header {
                background-color: #0070f3;
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                padding: 30px 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Test Email</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>This is a test email from your n8n Monitor installation.</p>
                <p>If you received this, your Resend integration is working correctly!</p>
                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  This email was sent from: ${fromEmail}
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}


