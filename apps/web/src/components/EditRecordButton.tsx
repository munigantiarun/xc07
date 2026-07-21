"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildPayload, type FormField, valueToFormString } from "@/lib/formFields";

export function EditRecordButton({
  endpoint,
  fields,
  initialValues,
  normalize,
  label = "Edit",
}: {
  endpoint: string;
  fields: FormField[];
  initialValues: Record<string, unknown>;
  normalize?: "probabilityPercent";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const field of fields) {
      let raw = initialValues[field.name];
      if (field.name === "probability" && typeof raw === "number" && raw <= 1) {
        raw = Math.round(raw * 1000) / 10; // show as %
      }
      next[field.name] = valueToFormString(raw);
    }
    setValues(next);
    setStatus("idle");
    setMessage("");
  }, [open, fields, initialValues]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const payload = buildPayload(values, normalize);
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-line bg-white px-2 py-1 text-xs font-medium text-ink hover:bg-slate-50"
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <form
            onSubmit={onSubmit}
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-panel p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Edit record</h3>
                <p className="mt-1 text-xs text-muted">
                  Saving marks this row as <span className="font-medium">Edited</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted hover:text-ink"
              >
                Close
              </button>
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
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.name]: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.name]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={status === "saving"}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {status === "saving" ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-line px-4 py-2 text-sm text-ink hover:bg-slate-50"
              >
                Cancel
              </button>
              {message ? <span className="text-xs text-red-700">{message}</span> : null}
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
