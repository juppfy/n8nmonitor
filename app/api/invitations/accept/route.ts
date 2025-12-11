import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth/server";

const schema = z.object({
  token: z.string(),
  name: z.string(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, name, password } = schema.parse(body);

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { inviter: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create user account using Better Auth server API
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: invitation.email,
        password,
        name,
      },
    });

    if (!signUpResult?.user?.id) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Update user role
    await prisma.user.update({
      where: { id: signUpResult.user.id },
      data: { role: invitation.role },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
      },
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

