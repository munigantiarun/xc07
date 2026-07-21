import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();

  const toDateRevenue = toFloat(body.to_date_revenue);
  const toDateCost = toFloat(body.to_date_cost);
  const toDateMargin =
    toFloat(body.to_date_margin) ??
    (toDateRevenue != null && toDateCost != null ? toDateRevenue - toDateCost : null);
  const toDateMarginPct =
    toFloat(body.to_date_margin_pct) ??
    (toDateRevenue && toDateMargin != null ? (toDateMargin / toDateRevenue) * 100 : null);

  const forecastRevenue = toFloat(body.forecast_revenue);
  const forecastCost = toFloat(body.forecast_cost);
  const forecastMargin =
    toFloat(body.forecast_margin) ??
    (forecastRevenue != null && forecastCost != null ? forecastRevenue - forecastCost : null);
  const forecastMarginPct =
    toFloat(body.forecast_margin_pct) ??
    (forecastRevenue && forecastMargin != null ? (forecastMargin / forecastRevenue) * 100 : null);

  try {
    const updated = await prisma.projectProfitability.update({
      where: { id },
      data: {
        project_id: toInt(body.project_id),
        client_id: toInt(body.client_id),
        billing_type: toStr(body.billing_type),
        to_date_revenue: toDateRevenue,
        to_date_cost: toDateCost,
        to_date_margin: toDateMargin,
        to_date_margin_pct: toDateMarginPct,
        forecast_revenue: forecastRevenue,
        forecast_cost: forecastCost,
        forecast_margin: forecastMargin,
        forecast_margin_pct: forecastMarginPct,
        is_edited: true,
      },
      include: { project: true, client: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
