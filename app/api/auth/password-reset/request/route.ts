import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email/resend";

const RESET_EXPIRY_MINUTES = 60;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Do not reveal whether user exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Invalidate previous reset tokens for this email
    await prisma.verification.deleteMany({
      where: { identifier: email, value: { startsWith: "reset-" } },
    });

    const token = `reset-${randomBytes(32).toString("hex")}`;
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verification.create({
      data: {
        identifier: email,
        value: token,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(email, token, expiresAt);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 });
  }
}

