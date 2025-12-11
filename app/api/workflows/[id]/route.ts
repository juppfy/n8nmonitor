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
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
    });

    if (!workflow || workflow.instance?.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Get workflow error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}


