import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  try {
    const updated = await prisma.utilizationMonthly.update({
      where: { id },
      data: {
        resource_id: toInt(body.resource_id),
        period: toStr(body.period),
        forecasted_utilization_pct: toFloat(body.forecasted_utilization_pct),
        actual_utilization_pct: toFloat(body.actual_utilization_pct),
        is_edited: true,
      },
      include: { resource: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
