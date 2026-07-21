export type SelectOption = { value: string; label: string };

export const billingTypeOptions: SelectOption[] = [
  { value: "Time & Materials", label: "Time & Materials" },
  { value: "Fixed Price", label: "Fixed Price" },
  { value: "Retainer", label: "Retainer" },
  { value: "Milestone", label: "Milestone" },
];

export const stageOptions: SelectOption[] = [
  "Prospect",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Verbal",
  "Closed Won",
  "Closed Lost",
].map((s) => ({ value: s, label: s }));

export const levelOptions: SelectOption[] = [
  "Junior",
  "Consultant",
  "Senior",
  "Lead",
  "Principal",
  "Manager",
].map((s) => ({ value: s, label: s }));

export const financialTypeOptions: SelectOption[] = [
  "Revenue",
  "COGS",
  "Opex",
  "Gross Margin",
  "EBITDA",
].map((s) => ({ value: s, label: s }));

export function toOptions(
  rows: { id: number; name: string | null }[],
): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.id),
    label: `${r.name ?? "Untitled"} (#${r.id})`,
  }));
}
