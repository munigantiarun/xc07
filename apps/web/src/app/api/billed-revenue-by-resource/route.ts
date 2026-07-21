import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const resourceId = req.nextUrl.searchParams.get("resource_id");
  const level = req.nextUrl.searchParams.get("level");
  const rows = await prisma.billedRevenueByResource.findMany({
    where: {
      ...(resourceId ? { resource_id: Number(resourceId) } : {}),
      ...(level ? { level } : {}),
    },
    orderBy: { id: "asc" },
    include: { resource: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id != null ? Number(body.id) : await nextId(prisma.billedRevenueByResource);
  const created = await prisma.billedRevenueByResource.create({
    data: {
      id,
      resource_id: toInt(body.resource_id),
      level: toStr(body.level),
      effective_revenue: toFloat(body.effective_revenue),
    },
    include: { resource: true },
  });
  return NextResponse.json(created, { status: 201 });
}
