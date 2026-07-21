import { prisma } from "@/lib/prisma";

type Delegate = { findFirst: (args: { orderBy: { id: "desc" } }) => Promise<{ id: number } | null> };

export async function nextId(delegate: Delegate): Promise<number> {
  const last = await delegate.findFirst({ orderBy: { id: "desc" } });
  return (last?.id ?? 0) + 1;
}

export function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}
