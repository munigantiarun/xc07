import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const resourceId = req.nextUrl.searchParams.get("resource_id");
  const rows = await prisma.utilizationYTD.findMany({
    where: {
      ...(resourceId ? { resource_id: Number(resourceId) } : {}),
    },
    orderBy: { id: "asc" },
    include: { resource: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const capacity = toFloat(body.capacity_hours_ytd);
  const actual = toFloat(body.actual_hours_ytd);
  const util =
    toFloat(body.utilization_ytd) ??
    (capacity && actual != null ? (actual / capacity) * 100 : null);

  const id = body.id != null ? Number(body.id) : await nextId(prisma.utilizationYTD);
  const created = await prisma.utilizationYTD.create({
    data: {
      id,
      resource_id: toInt(body.resource_id),
      utilization_target_type: toStr(body.utilization_target_type),
      capacity_hours_ytd: capacity,
      actual_hours_ytd: actual,
      utilization_ytd: util,
    },
    include: { resource: true },
  });
  return NextResponse.json(created, { status: 201 });
}
