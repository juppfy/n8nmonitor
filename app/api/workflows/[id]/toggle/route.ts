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
    const workflowId = params.id;

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        instance: { userId: session.user.id },
      },
      include: {
        instance: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const client = new N8nClient(workflow.instance.baseUrl, workflow.instance.apiKey);
    const toggled = workflow.isActive
      ? await client.deactivateWorkflow(workflow.n8nWorkflowId)
      : await client.activateWorkflow(workflow.n8nWorkflowId);

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        isActive: toggled.active,
        lastSync: new Date(),
      },
    });

    return NextResponse.json({
      message: toggled.active ? "Workflow activated" : "Workflow deactivated",
      workflow: {
        ...workflow,
        isActive: toggled.active,
      },
    });
  } catch (error) {
    console.error("Toggle workflow error:", error);
    return NextResponse.json(
      { error: "Failed to toggle workflow" },
      { status: 500 }
    );
  }
}


