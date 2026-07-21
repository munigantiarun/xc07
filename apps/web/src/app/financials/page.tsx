export const dynamic = "force-dynamic";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader, StatCard } from "@/components/ui";
import { financialTypeOptions } from "@/lib/formOptions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FinancialsPage() {
  const rows = await prisma.consolidatedFinancialEntry.findMany({
    orderBy: { id: "asc" },
  });

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);

  const fields = [
    {
      name: "type",
      label: "Type",
      type: "select" as const,
      required: true as const,
      options: financialTypeOptions,
    },
    { name: "name", label: "Name", required: true as const },
    {
      name: "period",
      label: "Period (YYYY-MM)",
      required: true as const,
      placeholder: "2025-07",
    },
    { name: "amount", label: "Amount (+/-)", type: "number" as const, required: true as const },
  ];

  return (
    <div>
      <PageHeader
        title="Consolidated financials"
        description="P&amp;L-style consolidated entries by type and period."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add financial entry
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard label="Entries" value={String(rows.length)} />
        <StatCard label="Net amount" value={money(total)} />
      </div>

      <EntrySection title="Add consolidated entry">
        <CreateForm title="New financial entry" endpoint="/api/consolidated-financial" fields={fields} />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Existing entries
      </h2>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "type", label: "Type" },
          { key: "name", label: "Name" },
          { key: "period", label: "Period" },
          { key: "amount", label: "Amount", align: "right" },
          { key: "actions", label: "" },
        ]}
        rows={rows.map((r) => ({
          id: r.id,
          type: r.type,
          name: <NameWithEdited edited={r.is_edited} name={r.name} />,
          period: r.period,
          amount: money(r.amount),
          actions: (
            <EditRecordButton
              endpoint={`/api/consolidated-financial/${r.id}`}
              fields={fields}
              initialValues={{
                type: r.type,
                name: r.name,
                period: r.period,
                amount: r.amount,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
