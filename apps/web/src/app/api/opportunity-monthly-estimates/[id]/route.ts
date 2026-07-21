import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  try {
    const updated = await prisma.opportunityMonthlyEstimate.update({
      where: { id },
      data: {
        client_id: toInt(body.client_id),
        period: toStr(body.period),
        weighted_revenue_amount: toFloat(body.weighted_revenue_amount),
        is_edited: true,
      },
      include: { client: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
