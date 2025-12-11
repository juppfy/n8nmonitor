import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { N8nClient } from "@/lib/n8n/client";
import { z } from "zod";

const syncWorkflowsSchema = z.object({
  instanceId: z.string(),
});

const listQuerySchema = z.object({
  instanceId: z.string().optional(),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  hasRecentErrors: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      instanceId: searchParams.get("instanceId") || undefined,
      active: searchParams.get("active") || undefined,
      hasRecentErrors: searchParams.get("hasRecentErrors") || undefined,
    });

    const where: any = {};

    // Limit to user's instances
    const userInstances = await prisma.n8nInstance.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const userInstanceIds = userInstances.map((i) => i.id);
    where.instanceId = { in: userInstanceIds };

    if (parsed.success && parsed.data.instanceId) {
      if (!userInstanceIds.includes(parsed.data.instanceId)) {
        return NextResponse.json(
          { error: "Instance not found" },
          { status: 404 }
        );
      }
      where.instanceId = parsed.data.instanceId;
    }

    if (parsed.success && parsed.data.active !== undefined) {
      where.isActive = parsed.data.active;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        _count: {
          select: {
            executions: true,
          },
        },
        executions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            status: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
      orderBy: { lastSync: "desc" },
    });

    // Optional filter: recently errored (based on last execution)
    const filteredWorkflows =
      parsed.success && parsed.data.hasRecentErrors
        ? workflows.filter(
            (wf) => wf.executions?.[0]?.status === "error"
          )
        : workflows;

    return NextResponse.json({ workflows: filteredWorkflows });
  } catch (error) {
    console.error("Get workflows error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { instanceId } = syncWorkflowsSchema.parse(body);

    // Verify instance belongs to user
    const instance = await prisma.n8nInstance.findFirst({
      where: {
        id: instanceId,
        userId: session.user.id,
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    // Fetch workflows from n8n
    const client = new N8nClient(instance.baseUrl, instance.apiKey);
    const n8nWorkflows = await client.getWorkflows();

    // Sync workflows to database
    const syncedWorkflows = [];
    for (const n8nWorkflow of n8nWorkflows) {
      const workflow = await prisma.workflow.upsert({
        where: {
          instanceId_n8nWorkflowId: {
            instanceId: instance.id,
            n8nWorkflowId: n8nWorkflow.id,
          },
        },
        update: {
          name: n8nWorkflow.name,
          isActive: n8nWorkflow.active,
          lastSync: new Date(),
        },
        create: {
          instanceId: instance.id,
          n8nWorkflowId: n8nWorkflow.id,
          name: n8nWorkflow.name,
          isActive: n8nWorkflow.active,
          lastSync: new Date(),
        },
      });
      syncedWorkflows.push(workflow);
    }

    // Update instance lastCheck
    await prisma.n8nInstance.update({
      where: { id: instance.id },
      data: { lastCheck: new Date() },
    });

    return NextResponse.json({
      success: true,
      count: syncedWorkflows.length,
      workflows: syncedWorkflows,
    });
  } catch (error: any) {
    console.error("Sync workflows error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync workflows" },
      { status: 500 }
    );
  }
}


