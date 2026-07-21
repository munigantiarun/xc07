# Continuum Demo Replica — Finance Lead

A Continuum PSA lookalike for **Finance Leads**: review KPIs, **add** finance data on each section page, and **edit** existing rows. Edited records show a WhatsApp-style **Edited** badge.

Inspired by [CrossConcept Continuum PSA](https://www.continuumpsa.io/) / [continuum.crossconceptinc.com](https://continuum.crossconceptinc.com/).  
Core columns match Continuum analytics tables from **Data GenFlow → Microsoft Fabric**, plus local audit fields for edit tracking.

| | |
|--|--|
| **Audience** | Finance Lead (end user) |
| **Auth** | None (open local demo) |
| **Out of scope** | Chatbot / insights apps, real Continuum login, pixel-perfect proprietary assets |

---

## Goals

- Finance-first UI: dashboard, revenue, profitability, consolidated P&L, pipeline, clients, projects, resources
- Seeded **synthetic** data (12 rows per table to start)
- **Add** forms on each section page (not a single catch-all `/entry` page)
- **Edit** existing rows via modal on each table
- **Edited** badge after any post-create update
- REST APIs: **GET** + **POST** + **PATCH**
- PostgreSQL via **Docker Desktop**

---

## Data flow

```text
Continuum (source)
        │
        ▼
Data GenFlow  ──►  Microsoft Fabric (tabular model)
        │
        ▼
This repo recreates the same business tables locally
        │
        ├─► PostgreSQL (Docker) + Prisma (+ audit columns)
        ├─► REST APIs (GET / POST / PATCH)
        └─► Finance Lead UI
              ├── Dashboard (aggregates)
              └── Section pages
                    ├── Add forms
                    ├── Data tables
                    ├── Edit (modal)
                    └── Edited badge
```

Fabric is **not** connected at runtime. Schema + seed data stay local so the demo is self-contained.

---

## How Finance Leads use the app

1. Open **http://localhost:3000** — Finance dashboard KPIs.
2. Open a **section** (Revenue, Profitability, Clients, …).
3. **Add** — use forms at the top of the page (`#add`).
4. **Edit** — click **Edit** on a table row, change fields, **Save changes**.
5. An **Edited** badge appears next to that record (only after it has been updated once).
6. Tables and dashboard refresh with the new values.

Suggested create order from scratch:

`Clients` → `Projects` → `Revenue` / `Profitability` / `Financials` → optional `Pipeline` & `Resources`

---

## UI pages

| Route | Review | Add / Edit |
|-------|--------|------------|
| `/` | Finance dashboard | Links to sections |
| `/revenue` | Forecast, actual, billed, YTD | Add + Edit + Edited badge |
| `/profitability` | Project profitability | Add + Edit + Edited badge |
| `/financials` | Consolidated P&L | Add + Edit + Edited badge |
| `/pipeline` | Opportunities + monthly estimates | Add + Edit + Edited badge |
| `/clients` | Client list | Add + Edit + Edited badge |
| `/clients/[id]` | Client detail | — |
| `/projects` | Project list | Add + Edit + Edited badge |
| `/projects/[id]` | Project detail + profitability | — |
| `/resources` | Resources, util, billed revenue | Add + Edit + Edited badge |
| `/resources/[id]` | Resource detail | — |

### Edit & Edited badge

| Behavior | Detail |
|----------|--------|
| Edit UI | Modal form pre-filled from the row; saves with `PATCH` |
| Badge | Small **Edited** label next to the name/period (WhatsApp-style) |
| When shown | Only when `is_edited = true` (set on first successful update) |
| New rows | Created with `is_edited = false` — no badge until edited |

---

## Features mapped to tables

| UI area | Tables | Page |
|---------|--------|------|
| Clients | `Client` | `/clients` |
| Projects | `Project` | `/projects` |
| Pipeline | `Opportunity`, `OpportunityMonthlyEstimate` | `/pipeline` |
| Revenue | `RevenueForecast`, `RevenueActual`, `BilledInvoice`, `ManagedRevenueYTD`, `SalesRevenueYTD` | `/revenue` |
| Profitability | `ProjectProfitability` | `/profitability` |
| Financials | `ConsolidatedFinancialEntry` | `/financials` |
| Resources | `Resource`, `UtilizationMonthly`, `UtilizationYTD`, `BilledRevenueByResource` | `/resources` |
| Dashboard | Aggregates across the above | `/` |

---

## Database structure

### Business columns (Fabric / GenFlow)

Source of truth for Continuum-shaped fields. Reference copy: [`docs/schema.sql`](docs/schema.sql).

```sql
CREATE TABLE Client (
    id INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE Project (
    id INTEGER PRIMARY KEY,
    name TEXT,
    client_id INTEGER REFERENCES Client(id),
    billing_type TEXT
);

CREATE TABLE Opportunity (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES Client(id),
    name TEXT,
    stage TEXT,
    owner TEXT,
    updated_on TEXT,
    start_date TEXT,
    finish_date TEXT,
    probability REAL,
    total_revenue REAL,
    weighted_revenue REAL
);

CREATE TABLE OpportunityMonthlyEstimate (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES Client(id),
    period TEXT,
    weighted_revenue_amount REAL
);

CREATE TABLE Resource (
    id INTEGER PRIMARY KEY,
    name TEXT,
    level TEXT,
    utilization_target_pct REAL
);

CREATE TABLE RevenueForecast (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES Client(id),
    period TEXT,
    forecast_revenue_amount REAL
);

CREATE TABLE RevenueActual (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES Client(id),
    period TEXT,
    actual_revenue_amount REAL
);

CREATE TABLE BilledInvoice (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES Client(id),
    period TEXT,
    billed_invoice_amount REAL
);

CREATE TABLE ManagedRevenueYTD (
    id INTEGER PRIMARY KEY,
    project_manager TEXT,
    revenue REAL
);

CREATE TABLE SalesRevenueYTD (
    id INTEGER PRIMARY KEY,
    project_manager TEXT
);

CREATE TABLE ProjectProfitability (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES Project(id),
    client_id INTEGER REFERENCES Client(id),
    billing_type TEXT,
    to_date_revenue REAL,
    to_date_cost REAL,
    to_date_margin REAL,
    to_date_margin_pct REAL,
    forecast_revenue REAL,
    forecast_cost REAL,
    forecast_margin REAL,
    forecast_margin_pct REAL
);

CREATE TABLE UtilizationMonthly (
    id INTEGER PRIMARY KEY,
    resource_id INTEGER REFERENCES Resource(id),
    period TEXT,
    forecasted_utilization_pct REAL,
    actual_utilization_pct REAL
);

CREATE TABLE UtilizationYTD (
    id INTEGER PRIMARY KEY,
    resource_id INTEGER REFERENCES Resource(id),
    utilization_target_type TEXT,
    capacity_hours_ytd REAL,
    actual_hours_ytd REAL,
    utilization_ytd REAL
);

CREATE TABLE BilledRevenueByResource (
    id INTEGER PRIMARY KEY,
    resource_id INTEGER REFERENCES Resource(id),
    level TEXT,
    effective_revenue REAL
);

CREATE TABLE ConsolidatedFinancialEntry (
    id INTEGER PRIMARY KEY,
    type TEXT,
    name TEXT,
    period TEXT,
    amount REAL
);
```

### Audit columns (local — every table)

Added in Prisma beyond the Fabric export:

| Column | Type | Purpose |
|--------|------|---------|
| `created_at` | timestamptz | Set on create |
| `updated_at` | timestamptz | Auto-updated on change |
| `is_edited` | boolean | `false` on create; `true` after `PATCH` → **Edited** badge |

### Entity relationships

```text
Client
  ├── Project ──► ProjectProfitability
  ├── Opportunity
  ├── OpportunityMonthlyEstimate
  ├── RevenueForecast
  ├── RevenueActual
  └── BilledInvoice

Resource
  ├── UtilizationMonthly
  ├── UtilizationYTD
  └── BilledRevenueByResource

ManagedRevenueYTD / SalesRevenueYTD     (by project_manager)
ConsolidatedFinancialEntry              (type / name / period / amount)
```

> **Note:** `SalesRevenueYTD` only has `id` + `project_manager` in the Fabric export; implemented as-is.

### Create / update helpers

- Record **ids** auto-increment when omitted on create.
- Opportunity **weighted_revenue** fills from `probability × total_revenue` when omitted.
- Opportunity **probability** accepts `0–1` or `0–100` (% from the UI).
- Profitability **margin** / **margin %** auto-calculate from revenue and cost when omitted.
- Utilization YTD **utilization_ytd** auto-calculates from capacity and actual hours when omitted.
- Any successful **PATCH** sets `is_edited = true`.

---

## REST API surface

**GET** = list / detail · **POST** = create · **PATCH** = update (`is_edited = true`).

```text
GET|POST       /api/clients
GET|PATCH      /api/clients/:id

GET|POST       /api/projects
GET|PATCH      /api/projects/:id
GET            /api/projects/:id/profitability

GET|POST       /api/opportunities
GET|PATCH      /api/opportunities/:id
GET|POST       /api/opportunity-monthly-estimates
PATCH          /api/opportunity-monthly-estimates/:id

GET|POST       /api/resources
GET|PATCH      /api/resources/:id
GET            /api/resources/:id/utilization-monthly
GET            /api/resources/:id/utilization-ytd
GET            /api/resources/:id/billed-revenue

GET|POST       /api/revenue/forecast
PATCH          /api/revenue/forecast/:id
GET|POST       /api/revenue/actual
PATCH          /api/revenue/actual/:id
GET|POST       /api/revenue/billed-invoices
PATCH          /api/revenue/billed-invoices/:id

GET|POST       /api/managed-revenue-ytd
PATCH          /api/managed-revenue-ytd/:id
GET|POST       /api/sales-revenue-ytd
PATCH          /api/sales-revenue-ytd/:id

GET|POST       /api/project-profitability
PATCH          /api/project-profitability/:id
GET|POST       /api/utilization/monthly
PATCH          /api/utilization/monthly/:id
GET|POST       /api/utilization/ytd
PATCH          /api/utilization/ytd/:id
GET|POST       /api/billed-revenue-by-resource
PATCH          /api/billed-revenue-by-resource/:id

GET|POST       /api/consolidated-financial
PATCH          /api/consolidated-financial/:id
GET            /api/dashboard/summary
GET            /api/health
```

JSON field names match SQL columns (`client_id`, `forecast_revenue_amount`, `is_edited`, etc.).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| API | Next.js Route Handlers |
| DB | PostgreSQL 16 (Docker Desktop) + Prisma |
| Seed | `apps/web/prisma/seed.ts` — 12 rows per table |

---

## Repo layout

```text
XCWorkspace/
  README.md
  docker-compose.yml              # Postgres → host port 5434
  docs/schema.sql                 # GenFlow business DDL reference
  apps/web/
    prisma/
      schema.prisma               # Fabric columns + audit fields
      seed.ts
    .env                          # DATABASE_URL (gitignored)
    src/
      app/                        # pages + /api/*
      components/
        AppShell.tsx
        CreateForm.tsx            # add forms
        EditRecordButton.tsx      # edit modal
        EditedBadge.tsx           # Edited label
        EntrySection.tsx
        ui.tsx
      lib/
        prisma.ts
        format.ts
        formOptions.ts
        formFields.ts
        ids.ts
```

---

## Run locally (Docker Desktop)

1. Start **Docker Desktop**.
2. From the repo root:

```bash
docker compose up -d

cd apps/web
npm install
npx prisma db push
npm run db:seed
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).

| Item | Value |
|------|--------|
| App | http://localhost:3000 |
| Postgres host port | **5434** → container `5432` |
| User / password / DB | `continuum` / `continuum` / `continuum_demo` |
| `DATABASE_URL` | `postgresql://continuum:continuum@127.0.0.1:5434/continuum_demo?schema=public` |

> Host port **5434** avoids conflict with local Postgres often already on `5432` / `5433`.

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start Postgres |
| `docker compose down` | Stop Postgres |
| `npm run dev` | Start UI + APIs |
| `npm run db:seed` | Reseed 12 rows per table |
| `npm run db:reset` | Reset schema + reseed |

After Prisma schema changes, restart `npm run dev` so the app picks up the new client.

---

## Notes

- Internal demos / prototyping only — no Continuum trademarks or real customer data in the repo.
- Dates and periods stay `TEXT` to match the Fabric export (`YYYY-MM`, etc.).
- `docs/schema.sql` is the Fabric business DDL; Prisma also defines `created_at` / `updated_at` / `is_edited`.
