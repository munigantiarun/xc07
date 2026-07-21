export const dynamic = "force-dynamic";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { EditedBadge, NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { toOptions } from "@/lib/formOptions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function RevenuePage() {
  const [forecast, actual, billed, managed, sales, clients] = await Promise.all([
    prisma.revenueForecast.findMany({ orderBy: { id: "asc" }, include: { client: true } }),
    prisma.revenueActual.findMany({ orderBy: { id: "asc" }, include: { client: true } }),
    prisma.billedInvoice.findMany({ orderBy: { id: "asc" }, include: { client: true } }),
    prisma.managedRevenueYTD.findMany({ orderBy: { id: "asc" } }),
    prisma.salesRevenueYTD.findMany({ orderBy: { id: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const clientOptions = toOptions(clients);
  const forecastTotal = forecast.reduce((s, r) => s + (r.forecast_revenue_amount ?? 0), 0);
  const actualTotal = actual.reduce((s, r) => s + (r.actual_revenue_amount ?? 0), 0);
  const billedTotal = billed.reduce((s, r) => s + (r.billed_invoice_amount ?? 0), 0);

  const forecastFields = [
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: clientOptions,
    },
    { name: "period", label: "Period (YYYY-MM)", required: true as const, placeholder: "2025-07" },
    {
      name: "forecast_revenue_amount",
      label: "Forecast amount",
      type: "number" as const,
      required: true as const,
    },
  ];
  const actualFields = [
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: clientOptions,
    },
    { name: "period", label: "Period (YYYY-MM)", required: true as const, placeholder: "2025-07" },
    {
      name: "actual_revenue_amount",
      label: "Actual amount",
      type: "number" as const,
      required: true as const,
    },
  ];
  const billedFields = [
    {
      name: "client_id",
      label: "Client",
      type: "select" as const,
      required: true as const,
      options: clientOptions,
    },
    { name: "period", label: "Period (YYYY-MM)", required: true as const, placeholder: "2025-07" },
    {
      name: "billed_invoice_amount",
      label: "Billed amount",
      type: "number" as const,
      required: true as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Forecast vs actual vs billed, plus YTD managed and sales revenue — primary Finance Lead view."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add revenue data
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Forecast total" value={money(forecastTotal)} />
        <StatCard label="Actual total" value={money(actualTotal)} />
        <StatCard label="Billed total" value={money(billedTotal)} />
      </div>

      <EntrySection title="Add revenue records">
        <CreateForm title="Revenue forecast" endpoint="/api/revenue/forecast" fields={forecastFields} />
        <CreateForm title="Revenue actual" endpoint="/api/revenue/actual" fields={actualFields} />
        <CreateForm title="Billed invoice" endpoint="/api/revenue/billed-invoices" fields={billedFields} />
        <div className="grid gap-4 lg:grid-cols-2">
          <CreateForm
            title="Managed revenue YTD"
            endpoint="/api/managed-revenue-ytd"
            fields={[
              { name: "project_manager", label: "Project manager", required: true },
              { name: "revenue", label: "Revenue YTD", type: "number", required: true },
            ]}
          />
          <CreateForm
            title="Sales revenue YTD"
            description="Fabric schema currently stores project manager only."
            endpoint="/api/sales-revenue-ytd"
            fields={[{ name: "project_manager", label: "Project manager", required: true }]}
          />
        </div>
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Revenue forecast
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "period", label: "Period" },
            { key: "client", label: "Client" },
            { key: "forecast", label: "Forecast", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={forecast.map((f) => ({
            period: (
              <NameWithEdited edited={f.is_edited} name={f.period} />
            ),
            client: f.client?.name,
            forecast: money(f.forecast_revenue_amount),
            actions: (
              <EditRecordButton
                endpoint={`/api/revenue/forecast/${f.id}`}
                fields={forecastFields}
                initialValues={{
                  client_id: f.client_id,
                  period: f.period,
                  forecast_revenue_amount: f.forecast_revenue_amount,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Revenue actual
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "period", label: "Period" },
            { key: "client", label: "Client" },
            { key: "actual", label: "Actual", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={actual.map((a) => ({
            period: <NameWithEdited edited={a.is_edited} name={a.period} />,
            client: a.client?.name,
            actual: money(a.actual_revenue_amount),
            actions: (
              <EditRecordButton
                endpoint={`/api/revenue/actual/${a.id}`}
                fields={actualFields}
                initialValues={{
                  client_id: a.client_id,
                  period: a.period,
                  actual_revenue_amount: a.actual_revenue_amount,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Billed invoices
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "period", label: "Period" },
            { key: "client", label: "Client" },
            { key: "billed", label: "Billed", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={billed.map((b) => ({
            period: <NameWithEdited edited={b.is_edited} name={b.period} />,
            client: b.client?.name,
            billed: money(b.billed_invoice_amount),
            actions: (
              <EditRecordButton
                endpoint={`/api/revenue/billed-invoices/${b.id}`}
                fields={billedFields}
                initialValues={{
                  client_id: b.client_id,
                  period: b.period,
                  billed_invoice_amount: b.billed_invoice_amount,
                }}
              />
            ),
          }))}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Managed revenue YTD
          </h2>
          <DataTable
            columns={[
              { key: "pm", label: "Project manager" },
              { key: "revenue", label: "Revenue", align: "right" },
              { key: "actions", label: "" },
            ]}
            rows={managed.map((m) => ({
              pm: (
                <span className="inline-flex items-center">
                  {m.project_manager}
                  <EditedBadge edited={m.is_edited} />
                </span>
              ),
              revenue: money(m.revenue),
              actions: (
                <EditRecordButton
                  endpoint={`/api/managed-revenue-ytd/${m.id}`}
                  fields={[
                    { name: "project_manager", label: "Project manager", required: true },
                    { name: "revenue", label: "Revenue YTD", type: "number", required: true },
                  ]}
                  initialValues={{
                    project_manager: m.project_manager,
                    revenue: m.revenue,
                  }}
                />
              ),
            }))}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Sales revenue YTD
          </h2>
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "pm", label: "Project manager" },
              { key: "actions", label: "" },
            ]}
            rows={sales.map((s) => ({
              id: s.id,
              pm: (
                <span className="inline-flex items-center">
                  {s.project_manager}
                  <EditedBadge edited={s.is_edited} />
                </span>
              ),
              actions: (
                <EditRecordButton
                  endpoint={`/api/sales-revenue-ytd/${s.id}`}
                  fields={[{ name: "project_manager", label: "Project manager", required: true }]}
                  initialValues={{ project_manager: s.project_manager }}
                />
              ),
            }))}
          />
          <p className="mt-2 text-xs text-muted">
            Fabric export currently only includes project_manager (no revenue column).
          </p>
        </div>
      </div>
    </div>
  );
}
