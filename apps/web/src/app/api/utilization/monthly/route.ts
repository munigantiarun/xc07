import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const resourceId = req.nextUrl.searchParams.get("resource_id");
  const period = req.nextUrl.searchParams.get("period");
  const rows = await prisma.utilizationMonthly.findMany({
    where: {
      ...(resourceId ? { resource_id: Number(resourceId) } : {}),
      ...(period ? { period } : {}),
    },
    orderBy: { id: "asc" },
    include: { resource: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id != null ? Number(body.id) : await nextId(prisma.utilizationMonthly);
  const created = await prisma.utilizationMonthly.create({
    data: {
      id,
      resource_id: toInt(body.resource_id),
      period: toStr(body.period),
      forecasted_utilization_pct: toFloat(body.forecasted_utilization_pct),
      actual_utilization_pct: toFloat(body.actual_utilization_pct),
    },
    include: { resource: true },
  });
  return NextResponse.json(created, { status: 201 });
}
