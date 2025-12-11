import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check if admin already exists (just in case)
    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (adminExists) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, name } = schema.parse(body);

    // Set user as admin and update name if provided
    await prisma.user.update({
      where: { id: userId },
      data: { 
        role: "ADMIN",
        ...(name && { name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup admin error:", error);
    return NextResponse.json(
      { error: "Failed to setup admin" },
      { status: 500 }
    );
  }
}

