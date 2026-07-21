import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  try {
    const updated = await prisma.revenueForecast.update({
      where: { id },
      data: {
        client_id: toInt(body.client_id),
        period: toStr(body.period),
        forecast_revenue_amount: toFloat(body.forecast_revenue_amount),
        is_edited: true,
      },
      include: { client: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
