import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import crypto from "crypto";
import { sendInvitationEmail } from "@/lib/email/resend";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { email, role } = schema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check for pending invitation
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent" },
        { status: 400 }
      );
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        role,
        invitedBy: session.user.id,
        expiresAt,
      },
    });

    // Send invitation email via Resend
    try {
      await sendInvitationEmail(email, token, invitation, session.user.id);
    } catch (emailError: any) {
      // If email fails, still return success but log the error
      // This allows the invitation to be created even if email fails
      console.error("Failed to send invitation email:", emailError);
      // You might want to return a warning or handle this differently
      // For now, we'll continue - the invitation link can be shared manually
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Send invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}

