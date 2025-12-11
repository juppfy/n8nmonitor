import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";
import { N8nClient } from "@/lib/n8n/client";

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
});

// Normalize base URL to avoid double-appending /api/v1
function normalizeBaseUrl(baseUrl: string) {
  let url = baseUrl.trim().replace(/\/+$/, ""); // remove trailing slash
  url = url.replace(/\/api(\/v1)?$/, ""); // strip trailing /api or /api/v1
  return url;
}

async function syncWorkflowsForInstance(instanceId: string, client: N8nClient) {
  try {
    console.log("Starting workflow sync for instance:", instanceId);
    const n8nWorkflows = await client.getWorkflows();
    console.log(`Fetched ${n8nWorkflows.length} workflows from n8n`);

    for (const n8nWorkflow of n8nWorkflows) {
      await prisma.workflow.upsert({
        where: {
          instanceId_n8nWorkflowId: {
            instanceId,
            n8nWorkflowId: n8nWorkflow.id,
          },
        },
        update: {
          name: n8nWorkflow.name,
          isActive: n8nWorkflow.active,
          lastSync: new Date(),
        },
        create: {
          instanceId,
          n8nWorkflowId: n8nWorkflow.id,
          name: n8nWorkflow.name,
          isActive: n8nWorkflow.active,
          lastSync: new Date(),
        },
      });
    }

    await prisma.n8nInstance.update({
      where: { id: instanceId },
      data: { lastCheck: new Date() },
    });
    
    console.log(`Successfully synced ${n8nWorkflows.length} workflows`);
  } catch (error) {
    console.error("Error syncing workflows:", error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    
    const instances = await prisma.n8nInstance.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            workflows: true,
            executions: true,
          },
        },
      },
    });

    // Don't return encrypted API keys
    const safeInstances = instances.map(({ apiKey, ...instance }) => ({
      ...instance,
      hasApiKey: !!apiKey,
    }));

    return NextResponse.json({ instances: safeInstances });
  } catch (error) {
    console.error("Get instances error:", error);
    return NextResponse.json(
      { error: "Failed to fetch instances" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createInstanceSchema.parse(body);
    const baseUrl = normalizeBaseUrl(parsed.baseUrl);
    const { name, apiKey } = parsed;

    // Test connection before saving
    const client = new N8nClient(baseUrl, encrypt(apiKey));
    const isConnected = await client.testConnection();

    if (!isConnected) {
      return NextResponse.json(
        { error: "Failed to connect to n8n instance. Please check your URL and API key." },
        { status: 400 }
      );
    }

    const instance = await prisma.n8nInstance.create({
      data: {
        userId: session.user.id,
        name,
        baseUrl,
        apiKey: encrypt(apiKey),
        isActive: true,
        lastCheck: new Date(),
      },
    });

    // Sync workflows immediately so counts reflect the connected instance
    const syncClient = new N8nClient(instance.baseUrl, instance.apiKey);
    await syncWorkflowsForInstance(instance.id, syncClient);

    const counts = await prisma.n8nInstance.findUnique({
      where: { id: instance.id },
      select: {
        _count: {
          select: { workflows: true, executions: true },
        },
      },
    });

    // Don't return encrypted API key
    const { apiKey: _, ...safeInstance } = instance;

    return NextResponse.json({
      instance: {
        ...safeInstance,
        hasApiKey: true,
        _count: counts?._count,
      },
    });
  } catch (error: any) {
    console.error("Create instance error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    );
  }
}


