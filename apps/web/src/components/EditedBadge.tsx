export function EditedBadge({ edited }: { edited?: boolean | null }) {
  if (!edited) return null;
  return (
    <span
      className="ml-1.5 inline-flex align-middle rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-100 ring-1 ring-slate-200/80"
      title="This record was edited after it was created"
    >
      Edited
    </span>
  );
}

export function NameWithEdited({
  name,
  edited,
}: {
  name: React.ReactNode;
  edited?: boolean | null;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span>{name}</span>
      <EditedBadge edited={edited} />
    </span>
  );
}
