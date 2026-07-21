import { NextResponse } from "next/server";
import { nextId, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.salesRevenueYTD.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id != null ? Number(body.id) : await nextId(prisma.salesRevenueYTD);
  const created = await prisma.salesRevenueYTD.create({
    data: {
      id,
      project_manager: toStr(body.project_manager),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
