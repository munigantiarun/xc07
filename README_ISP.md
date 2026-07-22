# README_ISP — Continuum Insights RAG Chatbot

**Purpose of this document:** Complete specification for a **new Cursor session with no prior conversation history**. Use this file alone to implement a Retrieval-Augmented Generation (RAG) chatbot that integrates with an **already-complete** Continuum Finance Lead demo website.

**Do not rebuild the Continuum PSA UI.** That application already exists. This project only builds the Insights / RAG chatbot and its APIs so the existing website (or a sibling Insights UI) can consume chat answers grounded in Continuum data.

**Beyond text Q&A:** The chatbot must also support **data analytics and visualization** — returning chart-ready JSON and tables the frontend can render with Chart.js, Recharts, or Apache ECharts (see §8A).

---

## 0. Quick start for a new Cursor agent

1. Confirm Continuum source app is running (see §12).
2. Create this chatbot as a **separate project/folder** (recommended) or `apps/insights/` in a monorepo.
3. Follow the implementation roadmap in §14 in order.
4. Treat Continuum REST `GET` endpoints as the **system of record** for business data.
5. Prefer **tool calling + RAG over API-derived documents** over dumping entire JSON into the LLM context.
6. For analytical / chart questions, fetch **structured tabular data**, aggregate in code, and return **`visuals[]` chart specs** — never generate chart images on the server (see §8A).

---

## 1. Overview of the existing application

### 1.1 What Continuum Demo is

The existing app is a **Finance Lead** demo replica of CrossConcept Continuum PSA analytics:

| Item | Value |
|------|--------|
| Local path (typical) | `/Users/arunmuniganti/Documents/CursorProjects/XCWorkspace` |
| App URL | `http://localhost:3000` |
| Stack | Next.js (App Router) + TypeScript + Tailwind + Prisma |
| Database | PostgreSQL 16 via Docker (`continuum_demo` on host port **5434**) |
| Auth on Continuum | **None** (open local demo) |
| Full Continuum docs | `XCWorkspace/README.md` |

Finance Leads use Continuum to:

- View dashboard KPIs (forecast vs actual revenue, margins, pipeline, utilization)
- Browse clients, projects, pipeline, revenue, profitability, financials, resources
- **Add** and **Edit** rows; edited rows show an **Edited** badge (`is_edited = true`)

### 1.2 How the chatbot fits in

```text
┌─────────────────────────────────────┐
│  Continuum Finance Lead Website     │  ← ALREADY BUILT (do not rebuild)
│  http://localhost:3000              │
│  UI + Postgres + REST GET/POST/PATCH│
└─────────────────┬───────────────────┘
                  │ REST GET (and later optional webhook/reindex)
                  ▼
┌─────────────────────────────────────┐
│  Insights RAG + Analytics Chatbot   │
│  (THIS PROJECT)                     │
│  Ingest → Embed → Retrieve → LLM    │
│  + structured query / aggregate     │
│  + chart-ready JSON specs           │
│  Exposes /api/chat (+ optional UI)  │
└─────────────────┬───────────────────┘
                  │ JSON: answer + table + visuals[]
                  ▼
┌─────────────────────────────────────┐
│  Consumer                           │
│  - Insights web UI (Recharts/etc.)  │
│  - and/or Continuum embeds chat     │
│  - renders text + tables + charts   │
└─────────────────────────────────────┘
```

**Audience:** Finance Lead asking English questions such as:

- “Which projects have the lowest margin?”
- “Forecast vs actual revenue by client?”
- “Who has the highest managed revenue YTD?”
- “Summarize weighted pipeline by stage.”
- “What is average utilization YTD?”
- “Show revenue by client as a bar chart.”
- “Display monthly forecast vs actual as a line chart.”
- “Top 10 clients by billed revenue.”

**Answer policy:** Ground answers in retrieved Continuum data and/or live tool results. Do not invent numbers. Cite sources (entity type + id + name when available). For visual asks, return **structured chart/table payloads** for the frontend to render interactively.

---

## 2. Sources of information for the chatbot

The chatbot uses **three layers** of knowledge. Priority for factual numbers: live tools > fresh retrieval chunks > model prior knowledge (never for amounts).

### 2.1 Primary: Continuum REST APIs (live)

Base URL (default): `http://localhost:3000`

Health check: `GET /api/health` → `{ "status": "ok", "service": "continuum-demo" }`

**Read endpoints the chatbot should use:**

```text
GET  /api/dashboard/summary
GET  /api/clients
GET  /api/clients/:id
GET  /api/projects
GET  /api/projects/:id
GET  /api/projects/:id/profitability
GET  /api/opportunities
GET  /api/opportunities/:id
GET  /api/opportunity-monthly-estimates
GET  /api/resources
GET  /api/resources/:id
GET  /api/resources/:id/utilization-monthly
GET  /api/resources/:id/utilization-ytd
GET  /api/resources/:id/billed-revenue
GET  /api/revenue/forecast
GET  /api/revenue/actual
GET  /api/revenue/billed-invoices
GET  /api/managed-revenue-ytd
GET  /api/sales-revenue-ytd
GET  /api/project-profitability
GET  /api/utilization/monthly
GET  /api/utilization/ytd
GET  /api/billed-revenue-by-resource
GET  /api/consolidated-financial
```

JSON uses **snake_case** field names aligned with Fabric tables, for example:

- `client_id`, `billing_type`
- `forecast_revenue_amount`, `actual_revenue_amount`, `billed_invoice_amount`
- `to_date_margin_pct`, `weighted_revenue`
- `is_edited`, `created_at`, `updated_at`

### 2.2 Secondary: Structured documents derived from APIs (RAG corpus)

At ingest time, convert API payloads into **human-readable text documents** (one document or chunk family per entity). Examples:

| Document type | Built from | Example content |
|---------------|------------|-----------------|
| `dashboard_summary` | `/api/dashboard/summary` | Totals for forecast, actual, billed, pipeline, avg margin, avg util |
| `client` | `/api/clients` (+ optional detail) | Client name, id, related project counts if available |
| `project` | `/api/projects` + profitability | Name, client, billing type, margins |
| `opportunity` | `/api/opportunities` | Stage, owner, probability, total/weighted revenue |
| `revenue_forecast` / `revenue_actual` / `billed_invoice` | revenue endpoints | Client, period, amount |
| `managed_revenue_ytd` | managed YTD | Project manager, revenue |
| `resource` | resources + util + billed | Level, target %, util YTD, effective revenue |
| `consolidated_financial` | financials | Type, name, period, amount |

These text docs are chunked, embedded, and stored in the vector DB.

### 2.3 Tertiary: Optional static docs (future)

Place optional Markdown under `docs/knowledge/` in the Insights project, for example:

- Glossary of Continuum finance terms
- How forecast vs actual vs billed differ
- Margin definitions

Not required for v1 if API-derived corpus is enough.

### 2.4 What not to use as RAG source (v1)

- Continuum **POST/PATCH** write APIs (chatbot is read-only)
- Direct SQL against Continuum Postgres from the chatbot (prefer REST so the API remains the contract)
- Production Continuum cloud / Fabric live connection (local demo only)

### 2.5 Continuum data model (for document writers)

Core entities (Fabric-aligned):

```text
Client
  ├── Project ──► ProjectProfitability
  ├── Opportunity
  ├── OpportunityMonthlyEstimate
  ├── RevenueForecast / RevenueActual / BilledInvoice

Resource
  ├── UtilizationMonthly / UtilizationYTD
  └── BilledRevenueByResource

ManagedRevenueYTD / SalesRevenueYTD
ConsolidatedFinancialEntry
```

`SalesRevenueYTD` currently only has `project_manager` (no revenue column) in the source schema — do not invent a revenue field.

---

## 3. Overall RAG architecture and data flow

### 3.1 Hybrid pattern (required)

Use **hybrid retrieval + analytics**:

1. **Semantic RAG** over ingested API documents (good for “summarize”, “which clients…”, fuzzy / definitional questions).
2. **Tool calling** for precise aggregates and latest numbers (good for “total forecast”, “top 3 margins”).
3. **Structured analytics path** when the user wants rankings, comparisons, time series, or charts (see §8A): fetch tabular rows → aggregate in deterministic TypeScript → emit `visuals[]` / `table`.

```text
User question
    │
    ▼
Chat API (Insights)
    │
    ├─► Intent router: text | table | chart | mixed
    │
    ├─► Embed question → Vector search (top-k chunks)     ← RAG path
    │         │
    │         └─► Retrieved context blocks
    │
    ├─► LLM with tools / analytics planner               ← structured path
    │         │
    │         ├─► ContinuumClient.get*(…) live REST
    │         └─► aggregateToSeries() → chart/table JSON
    │
    ▼
Prompt = system policy + retrieved chunks + tool/analytics results + history
    │
    ▼
Final payload: answer + citations + optional table + visuals[]
    │
    ▼
Frontend renders text + Recharts/ECharts/Chart.js + HTML table
```

### 3.2 Ingestion / reindex flow

```text
Continuum REST GET endpoints
        │
        ▼
Ingest job (script or POST /api/admin/reindex)
        │
        ├─► Normalize JSON → text documents + metadata
        ├─► Chunk documents
        ├─► Embed chunks
        └─► Upsert into vector store (delete+replace by source_id)
```

Reindex when Continuum data changes (manual button or cron). v1: **manual reindex** is enough.

### 3.3 Separation of concerns

| System | Responsibility |
|--------|----------------|
| Continuum (`:3000`) | Source of truth UI + DB + CRUD APIs |
| Insights chatbot | Ingest, vectors, chat orchestration, LLM, chat APIs/UI |
| Vector DB | Similarity search over chunks |
| LLM | **Ollama only** — local chat + embeddings (no cloud LLM) |

---

## 4. Recommended project structure

Suggested separate repo or folder name: `continuum-insights` (or `XCInsights`).

```text
continuum-insights/
  README.md                 # short run guide (can summarize this ISP)
  README_ISP.md             # copy of this spec (optional)
  .env.example
  package.json
  docker-compose.yml        # optional: Chroma / Postgres / Redis
  apps/
    web/                    # Next.js Insights UI + API routes
      src/
        app/
          page.tsx                # chat UI
          login/page.tsx          # demo auth
          api/
            chat/route.ts         # main chat endpoint
            chat/stream/route.ts  # optional SSE
            health/route.ts
            admin/reindex/route.ts
        components/
          ChatWindow.tsx
          MessageList.tsx
          CitationList.tsx
          charts/
            ChartRenderer.tsx     # maps ChartSpec → Recharts/ECharts
            DataTableView.tsx
        lib/
          continuum/
            client.ts             # typed Continuum REST client
            types.ts
          rag/
            ingest.ts
            chunk.ts
            embed.ts
            retrieve.ts
            prompt.ts
          analytics/
            intent.ts             # detect chart/table/text intent
            queryPlan.ts          # map NL → dataset + metrics + dims
            aggregate.ts          # groupBy / topN / time series
            chartSpec.ts          # build ChartSpec JSON (zod-validated)
          llm/
            provider.ts           # Ollama only (local LLM)
            tools.ts              # tool definitions → Continuum client
          auth.ts
          db.ts                   # users, sessions, chat history
      prisma/                     # Insights-only DB (users, messages) — optional
  scripts/
    ingest.ts                   # CLI: npm run ingest
  docs/
    knowledge/                  # optional static markdown
```

**Ports:**

| Service | Port |
|---------|------|
| Continuum (existing) | `3000` |
| Insights app | `3001` (recommended) |
| Vector DB (if local Chroma HTTP) | `8000` (optional) |

---

## 5. Ingestion pipeline (extract + chunk)

### 5.1 Extract

Implement `ContinuumClient` that fetches all list endpoints (and detail when useful). Handle HTTP errors; fail ingest if Continuum is down.

Pseudocode:

```ts
const summary = await client.dashboardSummary();
const clients = await client.clients();
const projects = await client.projects();
// ... remaining GET lists
```

### 5.2 Documentize

Convert each record to plain text with stable IDs in metadata:

```text
Document id: project:5
Title: Project — Contoso Cloud Migration
Body:
Entity: Project
id: 5
name: Contoso Cloud Migration
client_id: 3
billing_type: Time & Materials
to_date_revenue: 180000
to_date_margin_pct: 32.5
is_edited: false
```

Rules:

- Include units and field names so retrieval matches finance language.
- One primary entity per document when possible.
- Keep numbers exact; do not round away precision in the source text (UI can format later).

### 5.3 Chunking

| Setting | Recommendation (v1) |
|---------|---------------------|
| Strategy | Recursive character / paragraph split |
| Target chunk size | 500–800 tokens (~2000–3200 chars) |
| Overlap | 10–15% |
| Small records | Often **1 chunk per entity** (no split) |
| Large aggregates | Split dashboard narrative if needed |

Each chunk metadata must include:

```json
{
  "source": "continuum",
  "entity_type": "project",
  "entity_id": "5",
  "title": "Project — Contoso Cloud Migration",
  "updated_at": "ISO-8601 if available",
  "ingest_run_id": "uuid"
}
```

### 5.4 Idempotent upsert

On reindex:

1. Start `ingest_run_id`.
2. Upsert chunks by key `entity_type:entity_id:chunk_index` **or** delete all vectors with `source=continuum` then insert fresh.
3. Record ingest timestamp for admin UI.

---

## 6. Embedding model and vector database

### 6.1 Embeddings (local only — security)

**Do not use OpenAI, Anthropic, Voyage, Cohere, or any cloud embedding API.** Finance data must not leave the machine.

| Choice | Model | Notes |
|--------|-------|-------|
| **Required default** | Ollama `nomic-embed-text` | Local, solid for demo corpora |
| Alternative (local) | Ollama `mxbai-embed-large` | Higher quality; rebuild index if you switch |

Store the **embedding model name** in config; never mix dimensions across indexes. Rebuild Chroma after changing the embed model.

### 6.2 Vector database (recommended)

| Choice | When |
|--------|------|
| **Default v1: Chroma** (local persistent) | Fastest to ship locally |
| Alternative: **pgvector** on Postgres | If you already want one DB for Insights |
| Alternative: Pinecone / Weaviate | Cloud / production later |

v1 recommendation: **Chroma persistent directory** `./data/chroma` OR Docker Chroma.

Collection name: `continuum_finance`.

### 6.3 Similarity

- Metric: cosine
- Retrieve `top_k = 6` (configurable 4–10)
- Optional: metadata filters (`entity_type=project`) when intent classifier detects domain

---

## 7. Retrieval pipeline and prompt construction

### 7.1 Retrieve

```text
question
  → embed(question)
  → vectorQuery(top_k)
  → optionally rerank (v1: skip rerank)
  → format chunks as context block
```

Context block format:

```text
[Source 1] entity_type=project entity_id=5 title=...
<chunk text>

[Source 2] ...
```

### 7.2 Tools (live Continuum)

Expose tools to the LLM, for example:

| Tool name | Maps to |
|-----------|---------|
| `get_dashboard_summary` | `GET /api/dashboard/summary` |
| `list_clients` | `GET /api/clients` |
| `list_projects` | `GET /api/projects` |
| `get_project` | `GET /api/projects/:id` |
| `list_opportunities` | `GET /api/opportunities` |
| `list_revenue_forecast` | `GET /api/revenue/forecast` |
| `list_revenue_actual` | `GET /api/revenue/actual` |
| `list_billed_invoices` | `GET /api/revenue/billed-invoices` |
| `list_managed_revenue_ytd` | `GET /api/managed-revenue-ytd` |
| `list_project_profitability` | `GET /api/project-profitability` |
| `list_resources` | `GET /api/resources` |
| `list_utilization_ytd` | `GET /api/utilization/ytd` |
| `list_consolidated_financial` | `GET /api/consolidated-financial` |

Tool results should be truncated if huge (e.g. cap array length, summarize in code before sending to LLM).

### 7.3 System prompt (required policy)

Include rules similar to:

```text
You are a finance insights assistant for Continuum PSA demo data.
Answer ONLY using retrieved context, tool results, and analytics aggregates.
If data is missing, say you do not have it.
Never invent revenue, margins, or utilization numbers.
Prefer precise figures from tools/aggregations for totals, rankings, and charts.
When the user asks to show/chart/plot/visualize, produce a ChartSpec via analytics tools (do not describe ASCII charts as a substitute).
Cite sources as entity_type + entity_id (+ name).
Currency is USD unless stated otherwise.
Periods are often TEXT like YYYY-MM.
```

### 7.4 User prompt assembly

```text
## Retrieved context
{rag_chunks}

## Tool results (if any)
{tool_json}

## Conversation (last N turns)
{history}

## Question
{user_question}
```

Keep history short (last 6–10 turns) to control tokens.

---

## 8. LLM integration

### 8.1 Chat model — Ollama only (security requirement)

**Hard constraint:** Insights must use **only Ollama + local models**. Do **not** integrate OpenAI, Anthropic, or any other cloud LLM/embedding provider. Prompts, Continuum finance payloads, and embeddings must stay on-host.

| Provider | Recommended models | Role |
|----------|-------------------|------|
| **Ollama (required)** | Chat: `llama3.1`, `llama3.2`, `qwen2.5`, or `mistral` (prefer **tool/function calling**). Embed: `nomic-embed-text` (or `mxbai-embed-large`) | Chat + tools + embeddings |

| Concern | Guidance |
|---------|----------|
| Chat | `OLLAMA_BASE_URL=http://127.0.0.1:11434` only — no cloud base URLs |
| Tool calling | Prefer Llama 3.1+ / Qwen2.5. If tools fail, fall back to rule-based analytics intent (§8A) |
| Embeddings | Ollama only (`nomic-embed-text` / `mxbai-embed-large`) — never cloud embeddings |
| Quality | 7B–14B local models are the v1 target; tune prompts + analytics fallback rather than calling cloud APIs |
| Hardware | Apple Silicon / GPU recommended; CPU-only is slower but workable for small Continuum datasets |
| Security | No `OPENAI_*` / `ANTHROPIC_*` env vars; refuse to ship SDKs that send data off-machine |

Ollama setup (host machine):

```bash
# install from https://ollama.com — then:
ollama pull llama3.1
ollama pull nomic-embed-text
ollama serve   # usually already running as an app
```

Smoke test:

```bash
curl -s http://localhost:11434/api/tags
```

Config (only these LLM settings):

```ts
// LLM_PROVIDER=ollama   # fixed — do not add openai/anthropic branches
// OLLAMA_BASE_URL=http://127.0.0.1:11434
// OLLAMA_CHAT_MODEL=llama3.1
// OLLAMA_EMBED_MODEL=nomic-embed-text
```

Implement a thin Ollama provider (no multi-cloud abstraction required):

```ts
interface LlmProvider {
  embed(texts: string[]): Promise<number[][]>;
  chat(args: {
    system: string;
    messages: Message[];
    tools?: ToolDef[];
  }): Promise<ChatResult>; // may include tool_calls
}
```

### 8.2 Tool loop

1. Send messages + tools to LLM.
2. If `tool_calls`, execute Continuum client methods.
3. Append tool results; call LLM again.
4. Max 3–5 tool iterations; then force final answer.

### 8.3 Output schema for the website

Every chat response MUST be JSON matching this contract (validated with zod on the server). The frontend never receives chart PNGs/SVGs from the LLM — only **chart-ready JSON**.

```json
{
  "conversation_id": "uuid",
  "message_id": "uuid",
  "response_type": "mixed",
  "answer": "Acme leads billed revenue at $91,600. See the bar chart for all clients.",
  "table": {
    "title": "Billed revenue by client",
    "columns": [
      { "key": "client", "label": "Client", "type": "string" },
      { "key": "amount", "label": "Billed", "type": "currency" }
    ],
    "rows": [
      { "client": "Acme Manufacturing", "amount": 91600 },
      { "client": "Northwind Traders", "amount": 84000 }
    ]
  },
  "visuals": [
    {
      "id": "viz_1",
      "kind": "chart",
      "library_hint": "recharts",
      "spec": {
        "type": "bar",
        "title": "Billed revenue by client",
        "xField": "client",
        "yFields": ["amount"],
        "series": [
          { "name": "Billed", "field": "amount", "color": "#0d6e6e" }
        ],
        "data": [
          { "client": "Acme Manufacturing", "amount": 91600 },
          { "client": "Northwind Traders", "amount": 84000 }
        ],
        "xLabel": "Client",
        "yLabel": "USD",
        "stacked": false
      }
    }
  ],
  "citations": [
    { "entity_type": "billed_invoice", "entity_id": "1", "title": "Acme Manufacturing" }
  ],
  "used_tools": ["list_revenue_billed_invoices", "build_chart_spec"],
  "retrieved_chunk_ids": [],
  "analytics": {
    "intent": "chart",
    "dataset": "billed_invoice",
    "metric": "billed_invoice_amount",
    "dimension": "client",
    "chart_type": "bar",
    "filters": {}
  }
}
```

`response_type` is one of: `text` | `table` | `chart` | `mixed`.

- `text`: only `answer` (+ citations)
- `table`: `answer` + `table`
- `chart`: `answer` + `visuals` (one or more charts)
- `mixed`: `answer` + `table` and/or `visuals`

Streaming (optional v1.1): SSE with token deltas for `answer`, then a final event containing `table` / `visuals` / `citations`.

---

## 8A. Data analytics and visualization

The chatbot is not text-only. It must answer analytical questions from **structured Continuum data** and return payloads the website can render as **interactive charts and tables**.

### 8A.1 Structured data sources (in addition to document RAG)

| Source | How Insights uses it | Notes |
|--------|----------------------|-------|
| Continuum REST JSON (primary) | Fetch arrays via tools; treat as in-memory tables | Preferred contract |
| Continuum Postgres (optional debug) | Not required for v1 chat path | Prefer REST |
| Ingested RAG docs | Semantics, definitions, entity lookup | Not for precise chart series |
| Optional CSV / exports | Future: drop files under `data/uploads/` | Out of scope for v1 unless requested |
| Optional Insights SQL warehouse | Materialize Continuum snapshots into SQLite/Postgres for SQL tools | Nice-to-have Phase 3+ |

**Rule:** Chart numbers are computed from **tool-fetched tabular rows** (or a deterministic SQL layer over a snapshot), never invented by the LLM and never taken from fuzzy RAG text alone.

Canonical tabular datasets (map from Continuum APIs):

| Dataset id | API | Typical dimensions | Typical metrics |
|------------|-----|--------------------|-----------------|
| `revenue_forecast` | `/api/revenue/forecast` | `client`, `period` | `forecast_revenue_amount` |
| `revenue_actual` | `/api/revenue/actual` | `client`, `period` | `actual_revenue_amount` |
| `billed_invoice` | `/api/revenue/billed-invoices` | `client`, `period` | `billed_invoice_amount` |
| `project_profitability` | `/api/project-profitability` | `project`, `client`, `billing_type` | `to_date_revenue`, `to_date_margin`, `to_date_margin_pct`, forecast fields |
| `opportunity` | `/api/opportunities` | `stage`, `owner`, `client` | `total_revenue`, `weighted_revenue`, `probability` |
| `managed_revenue_ytd` | `/api/managed-revenue-ytd` | `project_manager` | `revenue` |
| `utilization_ytd` | `/api/utilization/ytd` | `resource` | `utilization_ytd`, hours |
| `utilization_monthly` | `/api/utilization/monthly` | `resource`, `period` | forecast/actual util % |
| `consolidated_financial` | `/api/consolidated-financial` | `type`, `period`, `name` | `amount` |
| `dashboard_summary` | `/api/dashboard/summary` | n/a (scalars) | KPI cards / single-value widgets |

Join tip: resolve `client_id` → client `name` via `/api/clients` before charting.

### 8A.2 Detecting visualization (and table) intent

Implement `detectAnalyticsIntent(message)` (LLM classifier **or** rules + LLM). Output:

```ts
type AnalyticsIntent = {
  wants_visualization: boolean;
  wants_table: boolean;
  wants_text: boolean;          // almost always true for a short narrative
  chart_type: "bar" | "line" | "pie" | "area" | "scatter" | "table" | null;
  dataset: string | null;       // e.g. revenue_forecast
  metric: string | null;
  dimension: string | null;     // group-by / x-axis
  secondary_metric?: string | null; // for dual series
  filters: {
    period?: string;            // "2025-01" or quarter like "Q1-2025"
    client_id?: number;
    top_n?: number;
  };
  compare?: "forecast_vs_actual" | "projects_by_revenue" | null;
};
```

**Keyword / phrase signals (rules layer):**

| Signal in user text | Likely intent |
|---------------------|---------------|
| show, display, chart, graph, plot, visualize | visualization |
| bar chart, bars, by client / by project | `bar` |
| line chart, trend, over time, monthly, timeline | `line` |
| pie, share, breakdown %, composition | `pie` |
| table, list as table, tabular | `table` |
| dashboard, KPI cards | `mixed` (multiple visuals or summary + charts) |
| top N, rank, highest, lowest | table and/or bar |
| compare X vs Y | multi-series bar/line |

**LLM classifier prompt (optional enhancement):** ask for strict JSON matching `AnalyticsIntent`. If confidence low, default to `text` and optionally attach a small table when ranking is clear.

### 8A.3 Retrieve and aggregate data for analytics

Pipeline:

```text
intent → query plan → fetch Continuum rows → normalize/join → aggregate → ChartSpec / TableSpec
```

**Query plan examples:**

| User ask | Dataset(s) | Aggregation |
|----------|------------|-------------|
| Revenue by client for Q1 | `revenue_actual` or `billed_invoice` | Filter periods in Q1; `groupBy client`, `sum(amount)` |
| Compare projects by revenue | `project_profitability` | `groupBy project`, metric `to_date_revenue`, sort desc |
| Monthly sales as line chart | `revenue_actual` (or forecast) | `groupBy period`, `sum(amount)`, sort period asc |
| Top 10 clients by revenue | billed or actual | `groupBy client`, sum, `top_n=10` |
| Forecast vs actual | forecast + actual | Align on `client` or `period`; two series |

**Quarter handling:** Continuum periods are `TEXT` like `YYYY-MM`. Map:

- `Q1-2025` → `2025-01`, `2025-02`, `2025-03`
- `Q2-2025` → `2025-04`…`2025-06`
- etc.

If the user says “Q1” without year, use the latest year present in the data.

**Aggregation must be deterministic TypeScript** (or SQL), not free-form LLM math:

```ts
function groupSum(rows, key, valueField): { [key]: string, amount: number }[]
function topN(rows, n): rows
function alignSeries(a, b, on): { x, a, b }[]
```

### 8A.4 Architecture: chart-ready JSON (not images)

```text
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Continuum    │────►│ Analytics engine│────►│ ChartSpec JSON   │
│ REST tables  │     │ aggregate.ts    │     │ (no PNG/SVG)     │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │ Frontend         │
                                             │ Recharts /       │
                                             │ Chart.js /       │
                                             │ ECharts          │
                                             └──────────────────┘
```

**Why JSON not images:**

- Interactive tooltips, legends, responsive layout
- Themeable in Continuum / Insights UI
- Accessible and downloadable as data
- Smaller payload; no hallucinated chart pixels

The LLM may **choose** chart type and labels, but **data arrays** come only from `aggregate.ts`.

### 8A.5 Standardized `ChartSpec` (frontend contract)

Validate with zod. One visual = one spec.

```ts
type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

type ChartSpec = {
  type: ChartType;
  title: string;
  subtitle?: string;
  xField: string;                 // category / time field in data[]
  yFields: string[];              // one or more numeric fields
  series: Array<{
    name: string;
    field: string;                // key in data objects
    color?: string;
  }>;
  data: Array<Record<string, string | number | null>>;
  xLabel?: string;
  yLabel?: string;
  stacked?: boolean;
  unit?: "usd" | "percent" | "hours" | "count";
};

type TableSpec = {
  title?: string;
  columns: Array<{
    key: string;
    label: string;
    type?: "string" | "number" | "currency" | "percent";
  }>;
  rows: Array<Record<string, string | number | null>>;
};

type Visual =
  | { id: string; kind: "chart"; library_hint?: "recharts" | "echarts" | "chartjs"; spec: ChartSpec }
  | { id: string; kind: "kpi"; spec: { label: string; value: number; unit?: string } };
```

**Frontend mapping:**

| Spec `type` | Recharts | ECharts | Chart.js |
|-------------|---------|---------|----------|
| `bar` | `BarChart` | `bar` | `bar` |
| `line` | `LineChart` | `line` | `line` |
| `pie` | `PieChart` | `pie` | `pie` |
| `area` | `AreaChart` | `line`+area | `line` filled |

`ChartRenderer` should ignore unknown fields and fail soft (show error card) if `data` empty.

### 8A.6 Choosing text vs table vs chart vs combination

| User need | Return |
|-----------|--------|
| Definition / explanation / “what is…” | `text` (+ RAG) |
| Single number / short fact | `text` (optional `visuals` KPI) |
| Ranked list, “top 10”, exact values to scan | `table` + short `answer` |
| “Show / chart / plot / visualize” | `chart` + short `answer` |
| “Compare … and show …” | `mixed` (answer + chart [+ table]) |
| Ambiguous “how is revenue doing?” | Prefer `text` + small chart if time series exists; else text + table |

**Decision algorithm (v1):**

1. Run intent detector.
2. If `wants_visualization` → build `ChartSpec` (default `bar` unless time dimension → `line`; composition → `pie`).
3. If `wants_table` or `top_n` without explicit chart words → `TableSpec`.
4. Always include a concise `answer` summarizing the insight (1–3 sentences).
5. If both chart and table useful (e.g. top 10 + bar), set `response_type: "mixed"`.
6. If analytics fetch fails, fall back to `text` explaining Continuum was unreachable — do not fabricate a chart.

Default chart type heuristics:

- Dimension = `period` → **line**
- Dimension = `client` / `project` / `stage` / `project_manager` → **bar**
- Metric share of total asked (“breakdown”, “share”) → **pie** (limit to ≤8 slices; group remainder as Other)

### 8A.7 Example analytical queries

| User question | Intent | Data path | Response |
|---------------|--------|-----------|----------|
| Show revenue by client for Q1 | chart/bar | Filter actual/billed periods in Q1; sum by client | `answer` + `visuals[bar]` + optional `table` |
| Compare projects by revenue | chart/bar | `project_profitability.to_date_revenue` by project | bar + table |
| Display monthly sales as a line chart | chart/line | sum `actual_revenue_amount` by `period` | line chart |
| Show the top 10 clients by revenue | table (+ bar) | sum billed/actual by client; top 10 | mixed |
| Forecast vs actual by month | chart/line multi-series | align forecast & actual on period | line with 2 series |
| Pie of pipeline by stage | chart/pie | sum `weighted_revenue` by `stage` | pie + short text |
| Utilization trend for resources | chart/line | `utilization_monthly` | line or multi-line |

### 8A.8 Best practices: combining RAG with structured analytics

1. **RAG for meaning, SQL/API tables for math.** Use RAG to resolve “what is margin %” or find which entity the user means; use structured aggregation for the chart series.
2. **Never chart from RAG chunk text alone.** Parsed prose numbers are error-prone.
3. **Validate ChartSpec with zod** before sending to the client.
4. **Cap series size** (e.g. top 12 bars; pie ≤ 8 slices) for readability.
5. **Stable sort** (period ascending; bars by metric descending unless user asks otherwise).
6. **Join dimensions to names** (`client_id` → name) so charts are human-readable.
7. **Cite datasets** in `citations` / `analytics` metadata (`dataset`, `metric`, endpoints used).
8. **Reindex RAG independently** from analytics; analytics always hits live Continuum GET (or a fresh snapshot).
9. **Empty states:** if filters yield no rows (e.g. Q1 with no data), return text explaining that — empty `visuals`.
10. **Security:** analytics tools are read-only; no Continuum POST/PATCH from chat.
11. **Frontend owns styling;** server sends semantic colors optionally but UI theme can override.
12. **Test with golden questions** that assert both narrative correctness and `visuals[0].spec.data` length/sums.

### 8A.9 Analytics tools for the LLM

In addition to list tools (§7.2), expose:

| Tool | Purpose |
|------|---------|
| `plan_analytics` | Return AnalyticsIntent JSON for the user message |
| `fetch_dataset` | `{ dataset, filters }` → normalized rows |
| `aggregate_dataset` | `{ rows_ref or inline, group_by, metric, op, top_n }` → series |
| `build_chart_spec` | `{ type, title, data, xField, yFields, series }` → ChartSpec |

Prefer implementing aggregation **in code tools**, not asking the LLM to output raw data arrays from memory.

---

## 9. How the chatbot exposes functionality for the website

### 9.1 Primary contract: HTTP API

**Insights service base:** `http://localhost:3001` (example)

#### `POST /api/chat`

Request:

```json
{
  "message": "Which projects have the lowest to-date margin %?",
  "conversation_id": "optional-uuid",
  "user_id": "optional-demo-user"
}
```

Response:

```json
{
  "conversation_id": "uuid",
  "message_id": "uuid",
  "response_type": "mixed",
  "answer": "...",
  "table": null,
  "visuals": [],
  "citations": [],
  "used_tools": [],
  "retrieved_chunk_ids": [],
  "analytics": null
}
```

When the user asks for a chart, populate `visuals` with one or more `ChartSpec` objects (§8A.5). The Continuum or Insights frontend MUST render `visuals` with Recharts/ECharts/Chart.js — do not expect image URLs.

#### `POST /api/admin/reindex`

Protected by `ADMIN_TOKEN` header. Triggers full ingest from Continuum.

#### `GET /api/health`

Checks Insights process + optional Continuum reachability:

```json
{
  "status": "ok",
  "continuum": "reachable",
  "vector_store": "ok",
  "last_ingest_at": "2026-07-21T..."
}
```

### 9.2 CORS / consumption from Continuum UI (optional later)

If Continuum embeds the chat widget:

- Allow origin `http://localhost:3000`
- Or reverse-proxy `/insights-api/*` through Continuum

v1 can ship a **standalone Insights chat UI** on `:3001` without modifying Continuum. Integrating a chat panel into Continuum is a **future** step and must not block chatbot delivery.

### 9.3 Auth for Insights (this project)

Continuum has **no auth**. Insights **should** have simple demo auth:

- Credentials login (e.g. `finance@demo.local` / `demo`) via NextAuth or similar
- Protect `/api/chat` and UI routes
- Do not require Continuum tokens

---

## 10. Environment variables, dependencies, configuration

### 10.1 `.env.example`

```bash
# Insights app
PORT=3001
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=replace-me

# Continuum source
CONTINUUM_API_BASE_URL=http://localhost:3000

# LLM — Ollama only (no OpenAI / Anthropic — security)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=llama3.1
OLLAMA_EMBED_MODEL=nomic-embed-text

# RAG
VECTOR_STORE=chroma
CHROMA_PATH=./data/chroma
CHROMA_COLLECTION=continuum_finance
RAG_TOP_K=6

# Analytics / charts
ANALYTICS_ENABLED=true
CHART_MAX_CATEGORIES=12
PIE_MAX_SLICES=8
DEFAULT_CHART_LIBRARY_HINT=recharts

# Admin
ADMIN_TOKEN=dev-admin-token

# Optional Insights DB for chat history
DATABASE_URL=file:./insights.db
```

### 10.2 Core dependencies (suggested)

- `next`, `react`, `typescript`, `tailwindcss`
- Ollama HTTP client (`fetch` to `:11434` or `ollama` npm package) — **do not** add `openai` / `@anthropic-ai/sdk`
- `chromadb` (or `@langchain/community` + chroma) **or** `pg` + `pgvector`
- `zod` for request + ChartSpec validation
- `next-auth` (or equivalent) for demo login
- **Charts (Insights UI):** `recharts` (default) — or `echarts` / `echarts-for-react` / `chart.js` + `react-chartjs-2`
- Optional: `langchain` / `llamaindex` — allowed but not required; prefer thin custom orchestration for clarity

### 10.3 Config defaults

| Key | Default |
|-----|---------|
| Continuum base | `http://localhost:3000` |
| Insights port | `3001` |
| top_k | `6` |
| max tool loops | `4` |
| temperature | `0`–`0.2` for finance |
| chart max categories | `12` |
| pie max slices | `8` |

---

## 11. Setup instructions

### 11.1 Prerequisites

1. Docker Desktop installed.
2. Continuum repo available and runnable.
3. Node.js 20+ and npm.
4. **Ollama** installed locally with chat + embed models pulled (`llama3.1`, `nomic-embed-text`). No cloud LLM API keys.

### 11.2 Start Continuum (source of truth)

```bash
cd /Users/arunmuniganti/Documents/CursorProjects/XCWorkspace
docker compose up -d
cd apps/web
npm install
npx prisma db push
npm run db:seed   # if empty
npm run dev       # http://localhost:3000
```

Verify:

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/dashboard/summary | head
```

### 11.3 Start Insights chatbot (this project)

```bash
cd /path/to/continuum-insights
cp .env.example .env
# confirm Ollama is running: curl -s http://127.0.0.1:11434/api/tags
# ensure OLLAMA_CHAT_MODEL and OLLAMA_EMBED_MODEL are pulled
npm install
npm run ingest          # pull Continuum → Ollama embed → vector store
npm run dev             # http://localhost:3001
```

Verify:

```bash
curl -s http://localhost:3001/api/health
curl -s -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Show billed revenue by client as a bar chart"}'
```

Expect `response_type` of `chart` or `mixed` and a non-empty `visuals[0].spec.data` array.
---

## 12. Continuum API quick reference (copy for implementers)

| Method | Path | Use |
|--------|------|-----|
| GET | `/api/health` | Liveness |
| GET | `/api/dashboard/summary` | KPI aggregates |
| GET | `/api/clients` | All clients |
| GET | `/api/projects` | All projects (+ client) |
| GET | `/api/opportunities` | Pipeline |
| GET | `/api/revenue/forecast` | Forecast amounts |
| GET | `/api/revenue/actual` | Actual amounts |
| GET | `/api/revenue/billed-invoices` | Billed amounts |
| GET | `/api/managed-revenue-ytd` | PM managed revenue |
| GET | `/api/project-profitability` | Margins |
| GET | `/api/resources` | People |
| GET | `/api/utilization/ytd` | Utilization |
| GET | `/api/consolidated-financial` | P&L entries |

Postgres for Continuum (if needed for debugging only):

| Field | Value |
|-------|--------|
| Host | `127.0.0.1` |
| Port | `5434` |
| DB | `continuum_demo` |
| User / pass | `continuum` / `continuum` |

Chatbot should still prefer REST over direct SQL.

---

## 13. Example questions for acceptance testing

### 13.1 Text / RAG

| Question | Expected behavior |
|----------|-------------------|
| What is total forecast revenue? | Tool or dashboard summary; exact number; `response_type: text` |
| List clients | From `list_clients` / RAG client docs |
| Lowest margin projects? | Rank `project_profitability` by `to_date_margin_pct` — text and/or table |
| Forecast vs actual gap? | Compare forecast and actual totals or by client |
| Who leads managed revenue YTD? | Sort managed revenue |
| Average utilization YTD? | From dashboard or utilization aggregate |
| Any edited revenue records? | Mention `is_edited` if present in corpus/tools |

### 13.2 Analytics / visualization

| Question | Expected behavior |
|----------|-------------------|
| Show revenue by client for Q1 | Filter Q1 periods; bar chart; `visuals[0].spec.type === "bar"` |
| Compare projects by revenue | Bar of `to_date_revenue` by project name |
| Display monthly sales as a line chart | Line by `period`; sorted ascending |
| Show the top 10 clients by revenue | Table (and optional bar); ≤10 rows |
| Forecast vs actual by month | Multi-series line/bar with two y fields |
| Pie chart of weighted pipeline by stage | `type: "pie"`; slices from opportunities |
| Just explain what billed revenue means | Text only; **no** fake chart |

Fail the build if:

- The model invents clients/projects not returned by Continuum
- A chart response has empty `data` while claiming results
- Chart totals disagree with a direct sum of tool-fetched rows (within rounding)

---

## 14. Step-by-step implementation roadmap

### Phase 0 — Scaffold (Day 1)

1. Create Next.js + TS + Tailwind app on port **3001**.
2. Add `.env.example`, health route, basic layout.
3. Implement `ContinuumClient` with `GET` helpers + zod types for key payloads.
4. Prove connectivity: page that renders live `dashboard/summary` JSON.

**Exit:** `GET /api/health` reports Continuum reachable.

### Phase 1 — Ingest + vectors (Day 1–2)

1. Documentize API entities to text.
2. Chunk + embed via Ollama (`nomic-embed-text`).
3. Persist to Chroma (or pgvector).
4. CLI `npm run ingest` + `POST /api/admin/reindex`.

**Exit:** Vector collection non-empty; sample similarity query returns relevant project/client chunks.

### Phase 2 — Chat orchestration (Day 2–3)

1. Implement retrieve → prompt → LLM answer (RAG only first).
2. Add tool calling for dashboard + profitability + revenue lists.
3. Return citations in API response.
4. Simple chat UI + demo login.

**Exit:** 5 text acceptance questions answered with grounded numbers.

### Phase 2B — Analytics + visualization (Day 3)

1. Implement `analytics/intent.ts`, `aggregate.ts`, `chartSpec.ts`.
2. Extend `POST /api/chat` response with `response_type`, `table`, `visuals`.
3. Add `ChartRenderer` + table component in Insights UI (Recharts recommended).
4. Cover golden visual questions in §13.2.

**Exit:** Bar/line/pie/table queries return valid ChartSpec/TableSpec; UI renders them.

### Phase 3 — Hardening (Day 4)

1. Truncate large tool payloads; cap chart categories.
2. Conversation history persistence.
3. Error states when Continuum is down (no fabricated charts).
4. Logging (no secrets); rate limit chat endpoint lightly.
5. README runbook for developers.

### Phase 4 — Optional Continuum embed (later)

1. Add chat drawer/iframe to Continuum UI calling Insights `:3001`.
2. CORS / proxy; render Continuum-side chart host using same `visuals` contract.
3. Shared branding.

**Do not block Phases 0–2B on Phase 4.**

---

## 15. Design decisions, assumptions, best practices, future work

### 15.1 Design decisions

| Decision | Rationale |
|----------|-----------|
| Separate Insights app | Continuum already complete; keeps RAG/LLM concerns isolated |
| REST as source of truth | Stable contract; avoids coupling to Continuum Prisma schema |
| Hybrid RAG + tools + analytics | RAG for semantics; tools/aggregations for precise numbers and charts |
| Chart-ready JSON (not images) | Interactive frontend rendering; portable across Chart.js/Recharts/ECharts |
| Deterministic aggregation in code | Avoids LLM arithmetic errors on finance data |
| Chroma + Ollama embeddings only | Keeps finance text on-host; no cloud LLM |
| No OpenAI / Anthropic | Security: prompts and Continuum data must not leave the machine |
| Read-only chatbot | Finance Q&A should not mutate Continuum via chat in v1 |
| Demo auth on Insights only | Continuum intentionally has no auth |

### 15.2 Assumptions

- Continuum runs locally on `:3000` during development.
- Data volume is small (dozens–hundreds of rows); naive full ingest and in-memory groupBy are fine.
- English-only questions in v1.
- USD and `YYYY-MM` period strings.
- Single-tenant demo (one org’s dummy data).
- Frontend will implement a `ChartRenderer` that understands `ChartSpec`.

### 15.3 Best practices

- Never call cloud LLMs; chat/embed only via local Ollama. Chat UI calls Insights server routes only.
- Always ground numeric claims in tool/RAG evidence.
- Build charts only from aggregated tool/SQL rows — never from free-text hallucinations.
- Version the embedding model; rebuild index on model change.
- Reindex RAG after Continuum seed or major data edits; analytics can stay live via GET.
- Sanitize logs (no full prompts with secrets).
- Deterministic temperature for finance answers.
- Explicit “I don’t know” / empty visuals when retrieval/tools lack data.
- Cap chart cardinality for readability.

### 15.4 Non-goals (v1)

- Rebuilding Continuum pages
- Writing to Continuum via chatbot
- Cloud LLM / embedding APIs (OpenAI, Anthropic, etc.)
- Server-side chart image generation (PNG/SVG from LLM)
- Multi-tenant SaaS auth / SSO
- Pixel-perfect Continuum branding clone
- Training/fine-tuning custom LLMs

### 15.5 Future improvements

- Automatic reindex on Continuum webhook / polling
- Local reranking (cross-encoder via Ollama or on-device model)
- Snapshot warehouse + safe SQL tool for heavier analytics
- Role-based answers (Finance vs PM)
- Evaluation harness (golden question set + chart data assertions)
- pgvector consolidation
- Streaming tokens + tool-progress events
- Embed chat widget inside Continuum sidebar with shared ChartRenderer
- Dashboard layouts (multiple visuals in one response)
---

## 16. Definition of done (v1)

- [ ] Insights app runs on `:3001` with demo login
- [ ] Continuum client successfully reads live APIs from `:3000`
- [ ] Ingest builds a vector index from Continuum entities
- [ ] `POST /api/chat` returns grounded answers + citations
- [ ] Tools used for at least dashboard summary and profitability/revenue questions
- [ ] Analytics path returns `response_type` + optional `table` / `visuals` (ChartSpec)
- [ ] Insights UI renders at least bar, line, and pie from `visuals` (e.g. Recharts)
- [ ] Golden visual questions in §13.2 pass (non-empty, consistent aggregates)
- [ ] Reindex endpoint/CLI documented
- [ ] `.env.example` and setup steps work on a clean machine
- [ ] Continuum UI is **unchanged** unless Phase 4 is explicitly requested

---

## 17. Handoff prompt for a new Cursor session

Paste this into a new Cursor chat in the Insights project folder:

```text
Implement the Continuum Insights RAG chatbot exactly as specified in README_ISP.md
(including section 8A — data analytics and visualization).

Constraints:
- Do NOT rebuild the Continuum PSA website.
- Continuum source is already running at http://localhost:3000 (REST GET APIs).
- Build Insights on port 3001 with hybrid RAG (Chroma + embeddings) and tool calling.
- Support analytical questions that return chart-ready JSON (ChartSpec) and tables —
  NOT server-generated chart images. Frontend should render with Recharts (or ECharts/Chart.js).
- Expose POST /api/chat with answer + citations + optional table/visuals for the website to consume.
- LLM/embeddings: Ollama only (see §8.1). Do NOT use OpenAI, Anthropic, or other cloud LLM APIs.
- Follow the Phase 0 → Phase 2 → Phase 2B → Phase 3 roadmap in README_ISP.md.

Start with Phase 0 scaffolding and Continuum client connectivity.
```

---

*End of README_ISP. A new session should not need any other conversation history to begin implementation.*