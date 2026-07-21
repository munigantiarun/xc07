export type FormField =
  | {
      name: string;
      label: string;
      type?: "text" | "number" | "date";
      required?: boolean;
      placeholder?: string;
      step?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      required?: boolean;
      options: { value: string; label: string }[];
    };

export function buildPayload(
  values: Record<string, string>,
  normalize?: "probabilityPercent",
): Record<string, unknown> {
  if (normalize === "probabilityPercent") {
    return {
      ...values,
      probability: values.probability ? Number(values.probability) / 100 : null,
    };
  }
  return values;
}

export function valueToFormString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
