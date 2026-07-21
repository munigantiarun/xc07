export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ResourceDetailPage({ params }: Props) {
  const id = Number((await params).id);
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      utilizationMonthly: true,
      utilizationYtd: true,
      billedRevenueByResource: true,
    },
  });
  if (!resource) notFound();

  const ytd = resource.utilizationYtd[0];
  const billed = resource.billedRevenueByResource[0];

  return (
    <div>
      <PageHeader
        title={resource.name ?? `Resource ${id}`}
        description={`${resource.level ?? "—"} · target ${pct(resource.utilization_target_pct)}`}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Util YTD" value={pct(ytd?.utilization_ytd)} />
        <StatCard label="Capacity hours YTD" value={num(ytd?.capacity_hours_ytd)} />
        <StatCard label="Actual hours YTD" value={num(ytd?.actual_hours_ytd)} />
        <StatCard label="Effective revenue" value={money(billed?.effective_revenue)} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Monthly utilization
      </h2>
      <DataTable
        columns={[
          { key: "period", label: "Period" },
          { key: "forecast", label: "Forecast %", align: "right" },
          { key: "actual", label: "Actual %", align: "right" },
        ]}
        rows={resource.utilizationMonthly.map((u) => ({
          period: u.period,
          forecast: pct(u.forecasted_utilization_pct),
          actual: pct(u.actual_utilization_pct),
        }))}
      />
    </div>
  );
}
