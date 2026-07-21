import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  const projectId = req.nextUrl.searchParams.get("project_id");
  const rows = await prisma.projectProfitability.findMany({
    where: {
      ...(clientId ? { client_id: Number(clientId) } : {}),
      ...(projectId ? { project_id: Number(projectId) } : {}),
    },
    orderBy: { id: "asc" },
    include: { project: true, client: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
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

  const id = body.id != null ? Number(body.id) : await nextId(prisma.projectProfitability);
  const created = await prisma.projectProfitability.create({
    data: {
      id,
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
    },
    include: { project: true, client: true },
  });
  return NextResponse.json(created, { status: 201 });
}
