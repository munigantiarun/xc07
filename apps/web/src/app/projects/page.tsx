export const dynamic = "force-dynamic";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { EditRecordButton } from "@/components/EditRecordButton";
import { NameWithEdited } from "@/components/EditedBadge";
import { EntrySection } from "@/components/EntrySection";
import { DataTable, PageHeader } from "@/components/ui";
import { billingTypeOptions, toOptions } from "@/lib/formOptions";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { id: "asc" },
      include: { client: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const fields = [
    { name: "name", label: "Project name", required: true as const },
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
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Projects linked to clients — foundation for profitability tracking."
        actions={
          <a
            href="#add"
            className="inline-flex items-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add project
          </a>
        }
      />

      <EntrySection title="Add project">
        <CreateForm
          title="New project"
          description="Link a project to an existing client."
          endpoint="/api/projects"
          fields={fields}
        />
      </EntrySection>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Existing projects
      </h2>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Project" },
          { key: "client", label: "Client" },
          { key: "billing", label: "Billing type" },
          { key: "actions", label: "" },
        ]}
        rows={projects.map((p) => ({
          id: p.id,
          name: (
            <NameWithEdited
              edited={p.is_edited}
              name={
                <Link className="font-medium text-accent hover:underline" href={`/projects/${p.id}`}>
                  {p.name}
                </Link>
              }
            />
          ),
          client: p.client?.name ?? "—",
          billing: p.billing_type,
          actions: (
            <EditRecordButton
              endpoint={`/api/projects/${p.id}`}
              fields={fields}
              initialValues={{
                name: p.name,
                client_id: p.client_id,
                billing_type: p.billing_type,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
