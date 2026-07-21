import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const projectId = Number((await params).id);
  const rows = await prisma.projectProfitability.findMany({
    where: { project_id: projectId },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(rows);
}
