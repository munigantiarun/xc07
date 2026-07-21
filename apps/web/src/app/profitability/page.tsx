export const dynamic = "force-dynamic";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { billingTypeOptions, toOptions } from "@/lib/formOptions";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ProfitabilityPage() {
  const [rows, clients, projects] = await Promise.all([
    prisma.projectProfitability.findMany({
      orderBy: { id: "asc" },
      include: { project: true, client: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const avgMargin =
    rows.reduce((s, r) => s + (r.to_date_margin_pct ?? 0), 0) / (rows.length || 1);

  const fields = [
    {
      name: "project_id",
      label: "Project",
      type: "select" as const,
      required: true as const,
      options: toOptions(projects),
    },
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: toOptions(clients),
    },
    {
      name: "billing_type",
      label: "Billing type",
      type: "select" as const,
      options: billingTypeOptions,
    },
    { name: "to_date_revenue", label: "To-date revenue", type: "number" as const },
    { name: "to_date_cost", label: "To-date cost", type: "number" as const },
    { name: "forecast_revenue", label: "Forecast revenue", type: "number" as const },
    { name: "forecast_cost", label: "Forecast cost", type: "number" as const },
  ];

  return (
    <div>
      <PageHeader
        title="Project profitability"
        description="To-date and forecast revenue, cost, and margin by project."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add profitability
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Projects" value={String(rows.length)} />
        <StatCard
          label="To-date revenue"
          value={money(rows.reduce((s, r) => s + (r.to_date_revenue ?? 0), 0))}
        />
        <StatCard label="Avg margin % (to date)" value={pct(avgMargin)} />
      </div>

      <EntrySection title="Add project profitability">
        <CreateForm
          title="New profitability row"
          description="Margin % auto-calculates when revenue and cost are provided."
          endpoint="/api/project-profitability"
          fields={fields}
        />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Existing profitability
      </h2>
      <DataTable
        columns={[
          { key: "project", label: "Project" },
          { key: "client", label: "Client" },
          { key: "billing", label: "Billing" },
          { key: "rev", label: "To-date rev", align: "right" },
          { key: "cost", label: "To-date cost", align: "right" },
          { key: "margin", label: "Margin", align: "right" },
          { key: "marginPct", label: "Margin %", align: "right" },
          { key: "fMarginPct", label: "Fcst margin %", align: "right" },
          { key: "actions", label: "" },
        ]}
        rows={rows.map((r) => ({
          project: <NameWithEdited edited={r.is_edited} name={r.project?.name} />,
          client: r.client?.name,
          billing: r.billing_type,
          rev: money(r.to_date_revenue),
          cost: money(r.to_date_cost),
          margin: money(r.to_date_margin),
          marginPct: pct(r.to_date_margin_pct),
          fMarginPct: pct(r.forecast_margin_pct),
          actions: (
            <EditRecordButton
              endpoint={`/api/project-profitability/${r.id}`}
              fields={fields}
              initialValues={{
                project_id: r.project_id,
                client_id: r.client_id,
                billing_type: r.billing_type,
                to_date_revenue: r.to_date_revenue,
                to_date_cost: r.to_date_cost,
                forecast_revenue: r.forecast_revenue,
                forecast_cost: r.forecast_cost,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
