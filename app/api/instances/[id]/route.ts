import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { N8nClient } from "@/lib/n8n/client";

const updateInstanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
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

    // Don't return encrypted API key
    const { apiKey, ...safeInstance } = instance;

    return NextResponse.json({
      instance: {
        ...safeInstance,
        hasApiKey: !!apiKey,
      },
    });
  } catch (error) {
    console.error("Get instance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch instance" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateInstanceSchema.parse(body);

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

    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    
    // If baseUrl or apiKey is being updated, test connection
    if (data.baseUrl !== undefined || data.apiKey !== undefined) {
      const baseUrl = data.baseUrl || instance.baseUrl;
      const apiKey = data.apiKey ? encrypt(data.apiKey) : instance.apiKey;
      
      const client = new N8nClient(baseUrl, apiKey);
      const isConnected = await client.testConnection();

      if (!isConnected) {
        return NextResponse.json(
          { error: "Failed to connect to n8n instance. Please check your URL and API key." },
          { status: 400 }
        );
      }

      if (data.baseUrl !== undefined) {
        updateData.baseUrl = data.baseUrl;
      }
      if (data.apiKey !== undefined) {
        updateData.apiKey = encrypt(data.apiKey);
      }
      updateData.lastCheck = new Date();
    }

    const updated = await prisma.n8nInstance.update({
      where: { id: params.id },
      data: updateData,
    });

    // Don't return encrypted API key
    const { apiKey, ...safeInstance } = updated;

    return NextResponse.json({
      instance: {
        ...safeInstance,
        hasApiKey: !!apiKey,
      },
    });
  } catch (error: any) {
    console.error("Update instance error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update instance" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.n8nInstance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete instance error:", error);
    return NextResponse.json(
      { error: "Failed to delete instance" },
      { status: 500 }
    );
  }
}


