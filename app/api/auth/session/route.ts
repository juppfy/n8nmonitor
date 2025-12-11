import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      user: user || {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: "USER",
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}


