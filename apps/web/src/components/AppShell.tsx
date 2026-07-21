"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Finance dashboard" },
  { href: "/revenue", label: "Revenue" },
  { href: "/profitability", label: "Profitability" },
  { href: "/financials", label: "P&L / Financials" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/resources", label: "Resources" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)]">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-300/90">
            Finance Lead
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-white">Continuum</div>
          <p className="mt-1 text-xs text-slate-400">Review · enter · track PSA finance data</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[var(--sidebar-active)] font-medium text-white"
                    : "hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          Entry forms live on each section page
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6 md:px-8">{children}</main>
    </div>
  );
}
