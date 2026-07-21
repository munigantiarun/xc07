export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const id = Number((await params).id);
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: true,
      opportunities: true,
      revenueForecasts: true,
      revenueActuals: true,
      billedInvoices: true,
    },
  });
  if (!client) notFound();

  const forecast = client.revenueForecasts.reduce(
    (s, r) => s + (r.forecast_revenue_amount ?? 0),
    0,
  );
  const actual = client.revenueActuals.reduce(
    (s, r) => s + (r.actual_revenue_amount ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader title={client.name ?? `Client ${id}`} description={`Client ID ${client.id}`} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Projects" value={String(client.projects.length)} />
        <StatCard label="Forecast" value={money(forecast)} />
        <StatCard label="Actual" value={money(actual)} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Projects</h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "billing", label: "Billing type" },
          ]}
          rows={client.projects.map((p) => ({
            id: p.id,
            name: p.name,
            billing: p.billing_type,
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Opportunities
      </h2>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "stage", label: "Stage" },
          { key: "owner", label: "Owner" },
          { key: "prob", label: "Prob %", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "weighted", label: "Weighted", align: "right" },
        ]}
        rows={client.opportunities.map((o) => ({
          name: o.name,
          stage: o.stage,
          owner: o.owner,
          prob: pct((o.probability ?? 0) * 100),
          total: money(o.total_revenue),
          weighted: money(o.weighted_revenue),
        }))}
      />
    </div>
  );
}
