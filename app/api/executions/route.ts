import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    
    // Get user's instances
    const userInstances = await prisma.n8nInstance.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    where.instanceId = { in: userInstances.map((i) => i.id) };

    if (instanceId) {
      // Verify instance belongs to user
      if (!userInstances.find((i) => i.id === instanceId)) {
        return NextResponse.json(
          { error: "Instance not found" },
          { status: 404 }
        );
      }
      where.instanceId = instanceId;
    }

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (status) {
      where.status = status;
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
        instance: {
          select: {
            id: true,
            name: true,
          },
        },
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error("Get executions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}


