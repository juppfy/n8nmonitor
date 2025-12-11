import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const record = await prisma.verification.findFirst({
      where: { value: token },
    });

    if (!record || !record.identifier || !record.expiresAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ error: "User account not found" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    await prisma.verification.deleteMany({
      where: { identifier: record.identifier, value: token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset confirm error:", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  }
}

