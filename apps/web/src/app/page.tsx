export const dynamic = "force-dynamic";
import { PageHeader, StatCard } from "@/components/ui";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

async function getSummary() {
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

  return {
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
      avg_to_date_margin_pct: profitability._avg.to_date_margin_pct ?? 0,
    },
    utilization: {
      avg_utilization_ytd: utilizationYtd._avg.utilization_ytd ?? 0,
    },
  };
}

export default async function DashboardPage() {
  const data = await getSummary();

  return (
    <div>
      <PageHeader
        title="Finance dashboard"
        description="Finance Lead view of Continuum PSA data — revenue, margins, pipeline, and utilization. Open any section to review data and add new records there."
      />
      <div className="mb-6 rounded-lg border border-teal-200 bg-[var(--accent-soft)] px-4 py-3 text-sm text-ink">
        Manual entry is on each page:{" "}
        <a className="font-medium text-accent underline" href="/revenue">
          Revenue
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/profitability">
          Profitability
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/financials">
          Financials
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/pipeline">
          Pipeline
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/clients">
          Clients
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/projects">
          Projects
        </a>
        ,{" "}
        <a className="font-medium text-accent underline" href="/resources">
          Resources
        </a>
        .
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients" value={String(data.counts.clients)} />
        <StatCard label="Projects" value={String(data.counts.projects)} />
        <StatCard label="Opportunities" value={String(data.counts.opportunities)} />
        <StatCard label="Resources" value={String(data.counts.resources)} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Forecast revenue" value={money(data.revenue.forecast_total)} hint="Sum of RevenueForecast" />
        <StatCard label="Actual revenue" value={money(data.revenue.actual_total)} hint="Sum of RevenueActual" />
        <StatCard label="Billed invoices" value={money(data.revenue.billed_total)} hint="Sum of BilledInvoice" />
        <StatCard label="Managed YTD" value={money(data.revenue.managed_ytd_total)} hint="ManagedRevenueYTD" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pipeline total" value={money(data.pipeline.total_revenue)} />
        <StatCard label="Weighted pipeline" value={money(data.pipeline.weighted_revenue)} />
        <StatCard
          label="Avg margin % (to date)"
          value={pct(data.profitability.avg_to_date_margin_pct)}
        />
        <StatCard
          label="Avg utilization YTD"
          value={pct(data.utilization.avg_utilization_ytd)}
        />
      </div>
    </div>
  );
}
