export const dynamic = "force-dynamic";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { projects: true, opportunities: true } },
    },
  });

  const fields = [{ name: "name", label: "Client name", required: true as const }];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Client master list used across revenue, pipeline, and profitability."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add client
          </a>
        }
      />

      <EntrySection title="Add client">
        <CreateForm
          title="New client"
          description="Creates a Client row used by projects, revenue, and pipeline."
          endpoint="/api/clients"
          fields={fields}
        />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Existing clients
      </h2>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "projects", label: "Projects", align: "right" },
          { key: "opps", label: "Opportunities", align: "right" },
          { key: "actions", label: "" },
        ]}
        rows={clients.map((c) => ({
          id: c.id,
          name: (
            <NameWithEdited
              edited={c.is_edited}
              name={
                <Link className="font-medium text-accent hover:underline" href={`/clients/${c.id}`}>
                  {c.name}
                </Link>
              }
            />
          ),
          projects: c._count.projects,
          opps: c._count.opportunities,
          actions: (
            <EditRecordButton
              endpoint={`/api/clients/${c.id}`}
              fields={fields}
              initialValues={{ name: c.name }}
            />
          ),
        }))}
      />
    </div>
  );
}
