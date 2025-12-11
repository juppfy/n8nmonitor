import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { N8nClient } from "@/lib/n8n/client";
import { z } from "zod";

const syncSchema = z.object({
  instanceId: z.string(),
  limit: z.number().min(1).max(200).optional(),
  workflowId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { instanceId, limit = 100, workflowId } = syncSchema.parse(body);

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

    const client = new N8nClient(instance.baseUrl, instance.apiKey);

    // Map n8n workflowId -> local workflow.id
    const workflows = await prisma.workflow.findMany({
      where: { instanceId: instance.id },
      select: { id: true, n8nWorkflowId: true },
    });
    const workflowMap = new Map(
      workflows.map((w) => [w.n8nWorkflowId, w.id])
    );

    const { data } = await client.getExecutions(workflowId, limit);

    let created = 0;
    let updated = 0;

    for (const exec of data) {
      const status =
        (exec as any).status ||
        (exec.finished ? "success" : exec.stoppedAt ? "error" : "running");

      const workflowLocalId = exec.workflowId
        ? workflowMap.get(exec.workflowId)
        : null;

      const startedAt = new Date(exec.startedAt);
      const finishedAt = exec.stoppedAt ? new Date(exec.stoppedAt) : null;

      const existing = await prisma.execution.findFirst({
        where: {
          instanceId: instance.id,
          n8nExecutionId: exec.id,
        },
      });

      if (existing) {
        await prisma.execution.update({
          where: { id: existing.id },
          data: {
            workflowId: workflowLocalId || null,
            status,
            startedAt,
            finishedAt,
            data: JSON.stringify(exec),
          },
        });
        updated += 1;
      } else {
        await prisma.execution.create({
          data: {
            instanceId: instance.id,
            workflowId: workflowLocalId || null,
            n8nExecutionId: exec.id,
            status,
            startedAt,
            finishedAt,
            data: JSON.stringify(exec),
          },
        });
        created += 1;
      }

      if (workflowLocalId) {
        await prisma.workflow.update({
          where: { id: workflowLocalId },
          data: {
            lastExecution: finishedAt || startedAt,
          },
        });
      }
    }

    await prisma.n8nInstance.update({
      where: { id: instance.id },
      data: { lastCheck: new Date() },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: data.length,
    });
  } catch (error: any) {
    console.error("Sync executions error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to sync executions" },
      { status: 500 }
    );
  }
}


