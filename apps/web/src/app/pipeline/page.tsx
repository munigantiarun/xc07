export const dynamic = "force-dynamic";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { stageOptions, toOptions } from "@/lib/formOptions";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PipelinePage() {
  const [opportunities, monthly, clients] = await Promise.all([
    prisma.opportunity.findMany({ orderBy: { id: "asc" }, include: { client: true } }),
    prisma.opportunityMonthlyEstimate.findMany({
      orderBy: { id: "asc" },
      include: { client: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const clientOptions = toOptions(clients);
  const weighted = opportunities.reduce((s, o) => s + (o.weighted_revenue ?? 0), 0);

  const oppFields = [
    { name: "name", label: "Opportunity name", required: true as const },
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: clientOptions,
    },
    { name: "stage", label: "Stage", type: "select" as const, options: stageOptions },
    { name: "owner", label: "Owner" },
    { name: "start_date", label: "Start date", type: "date" as const },
    { name: "finish_date", label: "Finish date", type: "date" as const },
    { name: "updated_on", label: "Updated on", type: "date" as const },
    {
      name: "probability",
      label: "Probability %",
      type: "number" as const,
      placeholder: "0–100",
    },
    { name: "total_revenue", label: "Total revenue", type: "number" as const },
  ];

  const monthlyFields = [
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: clientOptions,
    },
    { name: "period", label: "Period (YYYY-MM)", required: true as const },
    {
      name: "weighted_revenue_amount",
      label: "Weighted revenue amount",
      type: "number" as const,
      required: true as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Opportunities and monthly weighted estimates for finance forecasting."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add opportunity
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Opportunities" value={String(opportunities.length)} />
        <StatCard label="Weighted revenue" value={money(weighted)} />
        <StatCard label="Monthly estimates" value={String(monthly.length)} />
      </div>

      <EntrySection title="Add pipeline records">
        <CreateForm
          title="Opportunity"
          description="Weighted revenue auto-fills from probability × total when omitted."
          endpoint="/api/opportunities"
          normalize="probabilityPercent"
          fields={oppFields}
        />
        <CreateForm
          title="Opportunity monthly estimate"
          endpoint="/api/opportunity-monthly-estimates"
          fields={monthlyFields}
        />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Opportunities
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "client", label: "Client" },
            { key: "stage", label: "Stage" },
            { key: "owner", label: "Owner" },
            { key: "prob", label: "Prob", align: "right" },
            { key: "total", label: "Total", align: "right" },
            { key: "weighted", label: "Weighted", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={opportunities.map((o) => ({
            id: o.id,
            name: <NameWithEdited edited={o.is_edited} name={o.name} />,
            client: o.client?.name,
            stage: o.stage,
            owner: o.owner,
            prob: pct((o.probability ?? 0) * 100),
            total: money(o.total_revenue),
            weighted: money(o.weighted_revenue),
            actions: (
              <EditRecordButton
                endpoint={`/api/opportunities/${o.id}`}
                fields={oppFields}
                normalize="probabilityPercent"
                initialValues={{
                  name: o.name,
                  client_id: o.client_id,
                  stage: o.stage,
                  owner: o.owner,
                  start_date: o.start_date,
                  finish_date: o.finish_date,
                  updated_on: o.updated_on,
                  probability: o.probability,
                  total_revenue: o.total_revenue,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Opportunity monthly estimates
      </h2>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "client", label: "Client" },
          { key: "period", label: "Period" },
          { key: "amount", label: "Weighted amount", align: "right" },
          { key: "actions", label: "" },
        ]}
        rows={monthly.map((m) => ({
          id: m.id,
          client: m.client?.name,
          period: <NameWithEdited edited={m.is_edited} name={m.period} />,
          amount: money(m.weighted_revenue_amount),
          actions: (
            <EditRecordButton
              endpoint={`/api/opportunity-monthly-estimates/${m.id}`}
              fields={monthlyFields}
              initialValues={{
                client_id: m.client_id,
                period: m.period,
                weighted_revenue_amount: m.weighted_revenue_amount,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
