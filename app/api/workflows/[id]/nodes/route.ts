import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { N8nClient } from "@/lib/n8n/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    
    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id },
      include: {
        instance: true,
      },
    });

    if (!workflow || workflow.instance?.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch full workflow details from n8n including nodes
    const client = new N8nClient(workflow.instance.baseUrl, workflow.instance.apiKey);
    const n8nWorkflow = await client.getWorkflow(workflow.n8nWorkflowId);

    return NextResponse.json({
      nodes: n8nWorkflow.nodes || [],
      connections: n8nWorkflow.connections || {},
      settings: n8nWorkflow.settings,
    });
  } catch (error) {
    console.error("Get workflow nodes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow nodes" },
      { status: 500 }
    );
  }
}


