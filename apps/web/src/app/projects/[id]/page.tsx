export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const id = Number((await params).id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, projectProfitabilities: true },
  });
  if (!project) notFound();

  const profit = project.projectProfitabilities[0];

  return (
    <div>
      <PageHeader
        title={project.name ?? `Project ${id}`}
        description={`${project.client?.name ?? "No client"} · ${project.billing_type ?? "—"}`}
      />
      {profit ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="To-date revenue" value={money(profit.to_date_revenue)} />
            <StatCard label="To-date cost" value={money(profit.to_date_cost)} />
            <StatCard label="To-date margin" value={money(profit.to_date_margin)} />
            <StatCard label="Margin %" value={pct(profit.to_date_margin_pct)} />
          </div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Profitability detail
          </h2>
          <DataTable
            columns={[
              { key: "metric", label: "Metric" },
              { key: "value", label: "Value", align: "right" },
            ]}
            rows={[
              { metric: "Forecast revenue", value: money(profit.forecast_revenue) },
              { metric: "Forecast cost", value: money(profit.forecast_cost) },
              { metric: "Forecast margin", value: money(profit.forecast_margin) },
              { metric: "Forecast margin %", value: pct(profit.forecast_margin_pct) },
            ]}
          />
        </>
      ) : (
        <p className="text-sm text-muted">No profitability row for this project.</p>
      )}
    </div>
  );
}
