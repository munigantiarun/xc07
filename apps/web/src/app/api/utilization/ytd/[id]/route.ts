import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  const capacity = toFloat(body.capacity_hours_ytd);
  const actual = toFloat(body.actual_hours_ytd);
  const util =
    toFloat(body.utilization_ytd) ??
    (capacity && actual != null ? (actual / capacity) * 100 : null);

  try {
    const updated = await prisma.utilizationYTD.update({
      where: { id },
      data: {
        resource_id: toInt(body.resource_id),
        utilization_target_type: toStr(body.utilization_target_type),
        capacity_hours_ytd: capacity,
        actual_hours_ytd: actual,
        utilization_ytd: util,
        is_edited: true,
      },
      include: { resource: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
