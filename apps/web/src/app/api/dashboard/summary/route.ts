import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    clientCount,
    projectCount,
    opportunityCount,
    resourceCount,
    forecast,
    actual,
    billed,
    pipeline,
    managedYtd,
    profitability,
    utilizationYtd,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.opportunity.count(),
    prisma.resource.count(),
    prisma.revenueForecast.aggregate({ _sum: { forecast_revenue_amount: true } }),
    prisma.revenueActual.aggregate({ _sum: { actual_revenue_amount: true } }),
    prisma.billedInvoice.aggregate({ _sum: { billed_invoice_amount: true } }),
    prisma.opportunity.aggregate({
      _sum: { total_revenue: true, weighted_revenue: true },
    }),
    prisma.managedRevenueYTD.aggregate({ _sum: { revenue: true } }),
    prisma.projectProfitability.aggregate({
      _avg: { to_date_margin_pct: true, forecast_margin_pct: true },
      _sum: { to_date_revenue: true, to_date_margin: true },
    }),
    prisma.utilizationYTD.aggregate({ _avg: { utilization_ytd: true } }),
  ]);

  return NextResponse.json({
    counts: {
      clients: clientCount,
      projects: projectCount,
      opportunities: opportunityCount,
      resources: resourceCount,
    },
    revenue: {
      forecast_total: forecast._sum.forecast_revenue_amount ?? 0,
      actual_total: actual._sum.actual_revenue_amount ?? 0,
      billed_total: billed._sum.billed_invoice_amount ?? 0,
      managed_ytd_total: managedYtd._sum.revenue ?? 0,
    },
    pipeline: {
      total_revenue: pipeline._sum.total_revenue ?? 0,
      weighted_revenue: pipeline._sum.weighted_revenue ?? 0,
    },
    profitability: {
      to_date_revenue: profitability._sum.to_date_revenue ?? 0,
      to_date_margin: profitability._sum.to_date_margin ?? 0,
      avg_to_date_margin_pct: profitability._avg.to_date_margin_pct ?? 0,
      avg_forecast_margin_pct: profitability._avg.forecast_margin_pct ?? 0,
    },
    utilization: {
      avg_utilization_ytd: utilizationYtd._avg.utilization_ytd ?? 0,
    },
  });
}
