import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const resourceId = Number((await params).id);
  const rows = await prisma.utilizationMonthly.findMany({
    where: { resource_id: resourceId },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(rows);
}
