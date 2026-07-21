export const dynamic = "force-dynamic";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader } from "@/components/ui";
import { levelOptions, toOptions } from "@/lib/formOptions";
import { money, pct } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { id: "asc" },
    include: {
      utilizationYtd: true,
      billedRevenueByResource: true,
      utilizationMonthly: true,
    },
  });

  const resourceOptions = toOptions(resources);

  const resourceFields = [
    { name: "name", label: "Name", required: true as const },
    { name: "level", label: "Level", type: "select" as const, options: levelOptions },
    {
      name: "utilization_target_pct",
      label: "Utilization target %",
      type: "number" as const,
    },
  ];

  const monthlyFields = [
    {
      name: "resource_id",
      label: "Resource",
      type: "select" as const,
      required: true as const,
      options: resourceOptions,
    },
    { name: "period", label: "Period (YYYY-MM)", required: true as const },
    {
      name: "forecasted_utilization_pct",
      label: "Forecast util %",
      type: "number" as const,
    },
    { name: "actual_utilization_pct", label: "Actual util %", type: "number" as const },
  ];

  const ytdFields = [
    {
      name: "resource_id",
      label: "Resource",
      type: "select" as const,
      required: true as const,
      options: resourceOptions,
    },
    { name: "utilization_target_type", label: "Target type", placeholder: "Billable" },
    { name: "capacity_hours_ytd", label: "Capacity hours YTD", type: "number" as const },
    { name: "actual_hours_ytd", label: "Actual hours YTD", type: "number" as const },
  ];

  const billedFields = [
    {
      name: "resource_id",
      label: "Resource",
      type: "select" as const,
      required: true as const,
      options: resourceOptions,
    },
    { name: "level", label: "Level", type: "select" as const, options: levelOptions },
    {
      name: "effective_revenue",
      label: "Effective revenue",
      type: "number" as const,
      required: true as const,
    },
  ];

  const monthlyRows = resources.flatMap((r) =>
    r.utilizationMonthly.map((u) => ({ ...u, resourceName: r.name })),
  );
  const ytdRows = resources.flatMap((r) =>
    r.utilizationYtd.map((u) => ({ ...u, resourceName: r.name })),
  );
  const billedRows = resources.flatMap((r) =>
    r.billedRevenueByResource.map((b) => ({ ...b, resourceName: r.name })),
  );

  return (
    <div>
      <PageHeader
        title="Resources"
        description="People, utilization, and billed revenue by resource."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add resource data
          </a>
        }
      />

      <EntrySection title="Add resource records">
        <CreateForm title="Resource" endpoint="/api/resources" fields={resourceFields} />
        <CreateForm title="Monthly utilization" endpoint="/api/utilization/monthly" fields={monthlyFields} />
        <CreateForm title="Utilization YTD" endpoint="/api/utilization/ytd" fields={ytdFields} />
        <CreateForm
          title="Billed revenue by resource"
          endpoint="/api/billed-revenue-by-resource"
          fields={billedFields}
        />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Existing resources
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "level", label: "Level" },
            { key: "target", label: "Target %", align: "right" },
            { key: "util", label: "Util YTD %", align: "right" },
            { key: "billed", label: "Effective revenue", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={resources.map((r) => ({
            id: r.id,
            name: (
              <NameWithEdited
                edited={r.is_edited}
                name={
                  <Link
                    className="font-medium text-accent hover:underline"
                    href={`/resources/${r.id}`}
                  >
                    {r.name}
                  </Link>
                }
              />
            ),
            level: r.level,
            target: pct(r.utilization_target_pct),
            util: pct(r.utilizationYtd[0]?.utilization_ytd),
            billed: money(r.billedRevenueByResource[0]?.effective_revenue),
            actions: (
              <EditRecordButton
                endpoint={`/api/resources/${r.id}`}
                fields={resourceFields}
                initialValues={{
                  name: r.name,
                  level: r.level,
                  utilization_target_pct: r.utilization_target_pct,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Monthly utilization
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "resource", label: "Resource" },
            { key: "period", label: "Period" },
            { key: "forecast", label: "Forecast %", align: "right" },
            { key: "actual", label: "Actual %", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={monthlyRows.map((u) => ({
            resource: u.resourceName,
            period: <NameWithEdited edited={u.is_edited} name={u.period} />,
            forecast: pct(u.forecasted_utilization_pct),
            actual: pct(u.actual_utilization_pct),
            actions: (
              <EditRecordButton
                endpoint={`/api/utilization/monthly/${u.id}`}
                fields={monthlyFields}
                initialValues={{
                  resource_id: u.resource_id,
                  period: u.period,
                  forecasted_utilization_pct: u.forecasted_utilization_pct,
                  actual_utilization_pct: u.actual_utilization_pct,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Utilization YTD
      </h2>
      <div className="mb-8">
        <DataTable
          columns={[
            { key: "resource", label: "Resource" },
            { key: "type", label: "Target type" },
            { key: "capacity", label: "Capacity", align: "right" },
            { key: "actual", label: "Actual hrs", align: "right" },
            { key: "util", label: "Util %", align: "right" },
            { key: "actions", label: "" },
          ]}
          rows={ytdRows.map((u) => ({
            resource: (
              <NameWithEdited edited={u.is_edited} name={u.resourceName} />
            ),
            type: u.utilization_target_type,
            capacity: u.capacity_hours_ytd,
            actual: u.actual_hours_ytd,
            util: pct(u.utilization_ytd),
            actions: (
              <EditRecordButton
                endpoint={`/api/utilization/ytd/${u.id}`}
                fields={ytdFields}
                initialValues={{
                  resource_id: u.resource_id,
                  utilization_target_type: u.utilization_target_type,
                  capacity_hours_ytd: u.capacity_hours_ytd,
                  actual_hours_ytd: u.actual_hours_ytd,
                }}
              />
            ),
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Billed revenue by resource
      </h2>
      <DataTable
        columns={[
          { key: "resource", label: "Resource" },
          { key: "level", label: "Level" },
          { key: "revenue", label: "Effective revenue", align: "right" },
          { key: "actions", label: "" },
        ]}
        rows={billedRows.map((b) => ({
          resource: <NameWithEdited edited={b.is_edited} name={b.resourceName} />,
          level: b.level,
          revenue: money(b.effective_revenue),
          actions: (
            <EditRecordButton
              endpoint={`/api/billed-revenue-by-resource/${b.id}`}
              fields={billedFields}
              initialValues={{
                resource_id: b.resource_id,
                level: b.level,
                effective_revenue: b.effective_revenue,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
