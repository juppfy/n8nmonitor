import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    const execution = await prisma.execution.findFirst({
      where: {
        id,
        instance: { userId: session.user.id },
      },
      include: {
        instance: { select: { id: true, name: true, baseUrl: true } },
        workflow: { select: { id: true, name: true, n8nWorkflowId: true } },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    return NextResponse.json({
      execution: {
        ...execution,
        data: execution.data ? JSON.parse(execution.data) : null,
      },
    });
  } catch (error) {
    console.error("Get execution detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution" },
      { status: 500 }
    );
  }
}


