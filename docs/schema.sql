-- Continuum / Fabric GenFlow DDL (source of truth)

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
