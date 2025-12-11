import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { N8nClient } from "@/lib/n8n/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    
    const instance = await prisma.n8nInstance.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    const client = new N8nClient(instance.baseUrl, instance.apiKey);
    const isConnected = await client.testConnection();

    // Update lastCheck timestamp
    await prisma.n8nInstance.update({
      where: { id: params.id },
      data: { lastCheck: new Date() },
    });

    return NextResponse.json({
      connected: isConnected,
      message: isConnected
        ? "Successfully connected to n8n instance"
        : "Failed to connect to n8n instance",
    });
  } catch (error: any) {
    console.error("Test instance error:", error);
    return NextResponse.json(
      { 
        connected: false,
        error: error.message || "Failed to test connection" 
      },
      { status: 500 }
    );
  }
}


