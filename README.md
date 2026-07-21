# Continuum Replica — Discovery & Build Procedure

Goal: build a **local replica** of [Continuum](https://continuum.crossconceptinc.com/) (CrossConcept Continuum PSA) with **dummy data**, using your authenticated access for discovery — without needing production database credentials up front.

This doc is the decision guide. We do **not** build until you choose an approach below.

---

## 1. What we are replicating

Continuum is a cloud PSA. From the public product surface, expect modules such as:

| Area | Likely screens / entities |
|------|---------------------------|
| Auth | Login, session, roles/permissions |
| CRM | Leads, opportunities, accounts, contacts, activities |
| Projects | Projects, tasks, Gantt, budgets, milestones |
| Resources | People, skills, availability, scheduling, rates |
| Time & expense | Timesheets, expenses, approvals |
| Finance | Invoicing, A/R, revenue recognition hooks |
| BI | Dashboards, reports |
| Admin | Users, org settings, integrations (e.g. QuickBooks) |

Scope for v1 should be a **subset** (see Phase plan). A full 1:1 clone is a large product, not a weekend project.

---

## 2. Legal / practical note

Use this only for **internal learning / prototyping** with **synthetic data**. Do not copy proprietary assets, trademarks, or production customer data into a public repo. Prefer original branding (or clearly “demo / clone” naming) unless you have written permission.

---

## 3. Recommended overall approach

```
Authenticated browsing
        │
        ├─► Map UI (screens, nav, flows)
        ├─► Capture Network/API (schemas, payloads)
        ├─► Infer data model (entities + relations)
        └─► Decide scope + stack
                │
                ▼
        Build replica (API + UI + seed dummy data)
```

You do **not** need the live database. Browser Network + Application tabs usually give enough to reverse-engineer:

- REST/GraphQL endpoints
- Request/response JSON shapes
- Auth mechanism (cookie / JWT / session)
- Entity fields and relationships

---

## 4. What you can provide from the browser (preferred)

Log in at `https://continuum.crossconceptinc.com/`, open DevTools, and collect the following. You can paste exports into this repo under `discovery/` (we can create that folder when you start).

### 4.1 Navigation & screen inventory

For each major area you care about:

1. Screenshot (or short Loom) of the screen  
2. URL path (e.g. `/projects/123`)  
3. One-line description of what the user does there  

Deliverable: a simple list like:

```text
Dashboard          /
Projects list      /projects
Project detail     /projects/:id
Timesheet          /timesheets
...
```

### 4.2 Network HAR / API capture (highest value)

1. Open DevTools → **Network**  
2. Check **Preserve log**  
3. Filter: **Fetch/XHR** (and WS if present)  
4. Click through the flows you want replicated  
5. Export **HAR** (right-click list → Save all as HAR)  

Also note for a few key calls:

- Method + URL  
- Request headers (especially `Authorization`, cookies — **redact tokens** before sharing)  
- Request JSON body  
- Response JSON (status + body)  

**Sanitize before sharing:** strip bearer tokens, session cookies, real emails, customer names, SSNs, invoice amounts tied to real clients. Replace with `REDACTED` or dummy values.

### 4.3 Application / storage

In DevTools → **Application**:

- Cookies (names only + purpose if obvious)  
- Local Storage / Session Storage keys  
- Any cached API payloads  

### 4.4 Frontend clues (optional but useful)

In DevTools → **Sources** or page view-source:

- Framework hints (React/Angular/Vue/jQuery)  
- Bundle names, API base URL (`/api/...`, subdomain)  
- Feature flags if visible  

### 4.5 Console resources you offered

Any of these help, in priority order:

| Priority | Artifact | Why |
|----------|----------|-----|
| P0 | HAR of core flows | Exact API contracts |
| P0 | Screen map + screenshots | UI target |
| P1 | Redacted sample JSON for each entity | Seed schema |
| P1 | Role matrix (admin vs PM vs time-only) | Auth model |
| P2 | Export CSVs / reports from Continuum | Field names |
| P2 | Continuum API docs (if your plan includes API) | Official schema |
| P3 | DB dump / ERD (only if you have backend access) | Rare; usually unnecessary |

A production DB dump is **not required** and is riskier (PII). Prefer API shapes + dummy seed.

---

## 5. How we infer “database structure” without a DB

From API responses we build an **entity model**, for example:

```text
User ──< TimesheetEntry >── Project
Project ──< Task
Project ──< Invoice
Account ──< Opportunity
Account ──< Project
User ── Role / Permission
```

Process:

1. List unique resource paths (`/api/projects`, `/api/timesheets`, …)  
2. For each, document fields, types, required vs optional  
3. Note foreign keys (`projectId`, `userId`, …)  
4. Note enums/status workflows (`draft → submitted → approved`)  
5. Turn that into Prisma/Drizzle schema (or SQL) + seed scripts  

If Continuum exposes a documented REST API for your tenant, that can replace or augment HAR capture.

---

## 6. Decision points (choose before coding)

### A. Fidelity level

| Option | Meaning | Effort |
|--------|---------|--------|
| **A1 — Lookalike shell** | Login + nav + a few list/detail pages, fake data | Small |
| **A2 — Core PSA vertical** | Auth + projects + tasks + timesheets + simple dashboard | Medium (recommended) |
| **A3 — Broad PSA** | A2 + CRM + resources + invoicing + reports | Large |
| **A4 — Pixel / full clone** | Match layouts, menus, every module | Very large; not recommended first |

**Recommendation:** start **A2**, design schema so CRM/finance can be added later.

### B. How we get the model

| Option | Pros | Cons |
|--------|------|------|
| **B1 — Browser HAR + screens** | Fast, no DB access, enough for replica | You click through and sanitize |
| **B2 — Official Continuum API docs** | Cleaner contracts | May not cover UI-only endpoints |
| **B3 — DB schema / dump** | Exact tables | Access + PII risk; usually overkill |

**Recommendation:** **B1**, optionally plus **B2** if you have API access.

### C. Tech stack (proposal — adjustable)

| Layer | Suggestion |
|-------|------------|
| Frontend | Next.js (App Router) + TypeScript |
| UI | Tailwind; approximate Continuum layout, not copy assets blindly |
| Auth | NextAuth / simple session + roles |
| API | Next.js Route Handlers or separate Nest/Fastify API |
| DB | PostgreSQL + Prisma |
| Seed | Faker / scripted dummy org, users, projects, timesheets |
| Deploy | Local Docker Compose first |

### D. Data policy

- **No production data** in git  
- Seed only synthetic companies, people, hours, invoices  
- Keep real HAR/tokens out of the repo (use `discovery/` + `.gitignore`)

---

## 7. Phased procedure (once you approve)

### Phase 0 — Kickoff (you + agent)

1. Agree fidelity (**A2** recommended) and stack  
2. You log in and produce screen map + HAR for those modules  
3. Share sanitized artifacts in `discovery/`  
4. Agent produces: entity list, ERD sketch, API inventory, screen backlog  

**Exit:** written scope doc you approve.

### Phase 1 — Skeleton

1. Scaffold app + Postgres + Prisma  
2. Auth (login / logout / role stub)  
3. App shell: sidebar, header, placeholder routes matching Continuum nav  
4. Seed: org + admin user + dummy users  

**Exit:** you can log in locally and click empty module pages.

### Phase 2 — Core modules (A2)

For each module (Projects → Tasks → Timesheets → Dashboard):

1. Implement list + detail (+ create/edit as needed)  
2. Match primary fields from captured JSON  
3. Wire statuses/workflows that matter for demos  
4. Seed realistic dummy data  

**Exit:** end-to-end demo path works with dummy data.

### Phase 3 — Expand (optional)

CRM, resource scheduling, invoicing, reports — one module at a time, same capture → model → UI loop.

### Phase 4 — Polish

Permissions by role, empty states, filters, pagination, export stubs, basic charts.

---

## 8. Concrete “click path” for your first HAR (A2)

While Network is recording, do this once after login:

1. Land on **Dashboard** — wait for widgets to load  
2. Open **Projects** list — sort/filter once if available  
3. Open one **Project** detail — tasks, budget, team tabs if any  
4. Open **Timesheets** — create or edit one entry (or open existing)  
5. Open **Approvals** if present  
6. Open **Admin / Users** if visible (for role fields)  
7. Log out / session refresh if you want auth endpoints  

Export HAR → sanitize → drop into `discovery/phase0-core.har` (or paste key JSON samples).

---

## 9. What I need from you to proceed

Reply with choices (copy/paste):

```text
Fidelity: A1 | A2 | A3 | A4
Model source: B1 | B2 | B3
Stack OK with Next.js + Postgres + Prisma? Yes / No (prefer: …)
I will provide: [ ] screen map  [ ] HAR  [ ] API docs  [ ] screenshots
Must-have modules for v1: …
Nice-to-have later: …
Branding: Continuum-like demo name / original name: …
```

Then we create:

- `discovery/` + `.gitignore` for secrets  
- Scope doc from your artifacts  
- App scaffold only after Phase 0 sign-off  

---

## 10. Suggested repo layout (after kickoff)

```text
XCWorkspace/
  README.md                 ← this file
  discovery/                ← gitignored samples, HAR, notes
  docs/
    SCOPE.md                ← approved v1 scope
    DATA_MODEL.md           ← entities & relations
    API_INVENTORY.md        ← endpoints from HAR
  apps/web/                 ← Next.js app (when we build)
  packages/db/              ← Prisma schema + seed
  docker-compose.yml
```

---

## 11. Risks & expectations

| Risk | Mitigation |
|------|------------|
| Continuum is large | Hard scope A2; expand later |
| Some UI is server-rendered / obfuscated | Screenshots + DOM notes still enough for lookalike |
| Auth is complex (SSO, MFA) | Replica uses simple email/password first |
| Exact visual clone needs their CSS/assets | Approximate layout; do not scrape copyrighted assets without permission |
| HAR contains secrets | Sanitize; never commit tokens |

---

## Next step

Pick **Fidelity + Model source** (section 9).  
If you choose **B1**, start a recording session with the click path in section 8 and share sanitized outputs — then we lock scope and begin Phase 1.
