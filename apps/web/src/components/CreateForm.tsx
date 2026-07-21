"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildPayload, type FormField } from "@/lib/formFields";

export function CreateForm({
  title,
  description,
  endpoint,
  fields,
  normalize,
}: {
  title: string;
  description?: string;
  endpoint: string;
  fields: FormField[];
  normalize?: "probabilityPercent";
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const payload = buildPayload(values, normalize);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("ok");
      setMessage(`Saved as ID ${data.id}`);
      setValues({});
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-line bg-panel p-4 shadow-sm shadow-slate-900/5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "select" ? (
              <select
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              >
                <option value="">Select…</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                step={field.type === "number" ? field.step ?? "any" : undefined}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Add record"}
        </button>
        {message ? (
          <span
            className={`text-xs ${status === "error" ? "text-red-700" : "text-[var(--ok)]"}`}
          >
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
