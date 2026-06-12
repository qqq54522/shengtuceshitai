import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.generationTask.findMany({
    include: {
      assets: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }))
  });
}
