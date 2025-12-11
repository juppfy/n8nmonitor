import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}


