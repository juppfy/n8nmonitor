import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    
    return NextResponse.json({ 
      isSetup: !!admin 
    });
  } catch (error) {
    return NextResponse.json({ isSetup: false }, { status: 500 });
  }
}


