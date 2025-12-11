import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";

let resendInstance: Resend | null = null;

export async function getResendClient(userId?: string): Promise<Resend | null> {
  // If userId provided, use user's Resend API key
  if (userId) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { resendApiKey: true, resendFromEmail: true },
      });

      if (settings?.resendApiKey) {
        try {
          const apiKey = decrypt(settings.resendApiKey);
          return new Resend(apiKey);
        } catch (error) {
          console.error("Failed to decrypt user Resend API key:", error);
          // Fall through to global key
        }
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
      // Fall through to global key
    }
  }

  // Fallback to global Resend API key
  if (process.env.RESEND_API_KEY) {
    if (!resendInstance) {
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
  }

  return null;
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  invitation: { email: string; role: string; expiresAt: Date },
  inviterUserId?: string
) {
  const resend = await getResendClient(inviterUserId);
  if (!resend) {
    // If Resend is not configured, log and throw error
    console.error("Resend is not configured. Please set RESEND_API_KEY in environment variables.");
    throw new Error("Resend is not configured. Please configure RESEND_API_KEY in your environment variables.");
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accept-invite?token=${token}`;
  
  // Get from email - prefer user's setting, then global, then default
  let fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (inviterUserId) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: inviterUserId },
        select: { resendFromEmail: true },
      });
      if (settings?.resendFromEmail) {
        fromEmail = settings.resendFromEmail;
      }
    } catch (error) {
      // Use default
    }
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Invitation to n8n Monitor",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              .button { 
                display: inline-block; 
                padding: 14px 28px; 
                background-color: #0070f3; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0;
                font-weight: 600;
              }
              .button:hover {
                background-color: #0051cc;
              }
              .footer { 
                margin-top: 30px; 
                font-size: 12px; 
                color: #666; 
                padding-top: 20px;
                border-top: 1px solid #eee;
              }
              .info-box {
                background-color: #f0f9ff;
                border-left: 4px solid #0070f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .link {
                word-break: break-all; 
                color: #0070f3;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">You've been invited!</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You've been invited to join <strong>n8n Monitor</strong> with the role: <strong>${invitation.role}</strong></p>
                
                <div class="info-box">
                  <p style="margin: 0;"><strong>Role:</strong> ${invitation.role}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Expires:</strong> ${new Date(invitation.expiresAt).toLocaleString()}</p>
                </div>

                <p>Click the button below to accept your invitation and create your account:</p>
                <div style="text-align: center;">
                  <a href="${inviteLink}" class="button">Accept Invitation</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p class="link">${inviteLink}</p>
              </div>
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 10px;">This invitation will expire on ${new Date(invitation.expiresAt).toLocaleString()}.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}

export async function sendExecutionFailureEmail(
  userId: string,
  execution: {
    workflowName: string;
    instanceName: string;
    error: string;
    executionId: string;
  }
) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });

  if (!settings?.emailNotificationsEnabled || !settings?.executionFailureAlerts) {
    return;
  }

  const resend = await getResendClient(userId);
  if (!resend) {
    return; // Silently fail if Resend not configured
  }

  const fromEmail = settings.resendFromEmail || process.env.RESEND_FROM_EMAIL || "noreply@n8n-monitor.dev";
  const executionUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/executions/${execution.executionId}`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: settings.user.email,
      subject: `Workflow Execution Failed: ${execution.workflowName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                background-color: #dc2626;
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                padding: 30px 20px;
              }
              .error-box { 
                background-color: #fee; 
                border-left: 4px solid #dc2626; 
                padding: 15px; 
                margin: 20px 0;
                border-radius: 4px;
              }
              .info-box { 
                background-color: #f0f9ff; 
                padding: 15px; 
                margin: 20px 0;
                border-left: 4px solid #0070f3;
                border-radius: 4px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #0070f3;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⚠️ Workflow Execution Failed</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>A workflow execution has failed in your n8n Monitor instance.</p>
                
                <div class="info-box">
                  <p style="margin: 0;"><strong>Workflow:</strong> ${execution.workflowName}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Instance:</strong> ${execution.instanceName}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Execution ID:</strong> ${execution.executionId}</p>
                </div>
                
                <div class="error-box">
                  <p style="margin: 0 0 10px 0;"><strong>Error:</strong></p>
                  <pre>${execution.error}</pre>
                </div>
                
                <div style="text-align: center;">
                  <a href="${executionUrl}" class="button">View Execution Details</a>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send execution failure email:", error);
  }
}


