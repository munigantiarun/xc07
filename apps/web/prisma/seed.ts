import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clients = [
  "Acme Manufacturing",
  "Northwind Traders",
  "Contoso Health",
  "Fabrikam Logistics",
  "Adventure Works",
  "Wide World Importers",
  "Litware Insurance",
  "Tailspin Toys",
  "Alpine Ski House",
  "City Power & Light",
  "Humongous Insurance",
  "Southridge Video",
];

const projectNames = [
  "ERP Rollout",
  "Cloud Migration",
  "CRM Upgrade",
  "Data Platform",
  "Security Hardening",
  "Mobile App Rebuild",
  "Integration Hub",
  "Analytics Dashboard",
  "Network Refresh",
  "Shared Services",
  "AI Pilot",
  "Compliance Program",
];

const billingTypes = ["Time & Materials", "Fixed Price", "Retainer", "Milestone"];
const stages = ["Prospect", "Qualified", "Proposal", "Negotiation", "Verbal", "Closed Won", "Closed Lost"];
const owners = [
  "Priya Shah",
  "Marcus Lee",
  "Elena Rossi",
  "Jordan Blake",
  "Sam Okonkwo",
  "Ava Chen",
  "Noah Patel",
  "Mia Torres",
  "Liam Brooks",
  "Sofia Nguyen",
  "Ethan Park",
  "Olivia Reed",
];
const levels = ["Junior", "Consultant", "Senior", "Lead", "Principal", "Manager"];
const periods = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
];
const financialTypes = ["Revenue", "COGS", "Opex", "Gross Margin", "EBITDA"];

function round(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
  // Clear in FK-safe order
  await prisma.consolidatedFinancialEntry.deleteMany();
  await prisma.billedRevenueByResource.deleteMany();
  await prisma.utilizationYTD.deleteMany();
  await prisma.utilizationMonthly.deleteMany();
  await prisma.projectProfitability.deleteMany();
  await prisma.salesRevenueYTD.deleteMany();
  await prisma.managedRevenueYTD.deleteMany();
  await prisma.billedInvoice.deleteMany();
  await prisma.revenueActual.deleteMany();
  await prisma.revenueForecast.deleteMany();
  await prisma.opportunityMonthlyEstimate.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.project.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.client.deleteMany();

  for (let i = 1; i <= 12; i++) {
    await prisma.client.create({
      data: { id: i, name: clients[i - 1] },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.project.create({
      data: {
        id: i,
        name: `${clients[i - 1].split(" ")[0]} ${projectNames[i - 1]}`,
        client_id: i,
        billing_type: billingTypes[(i - 1) % billingTypes.length],
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    const total = 80000 + i * 25000;
    const probability = [0.1, 0.2, 0.35, 0.5, 0.6, 0.75, 0.85, 0.9, 0.4, 0.55, 0.3, 1.0][i - 1];
    await prisma.opportunity.create({
      data: {
        id: i,
        client_id: i,
        name: `${projectNames[i - 1]} Opportunity`,
        stage: stages[(i - 1) % stages.length],
        owner: owners[i - 1],
        updated_on: `2025-${String(((i - 1) % 12) + 1).padStart(2, "0")}-15`,
        start_date: `2025-${String(((i - 1) % 12) + 1).padStart(2, "0")}-01`,
        finish_date: `2025-${String(((i + 2) % 12) + 1).padStart(2, "0")}-28`,
        probability,
        total_revenue: total,
        weighted_revenue: round(total * probability),
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.opportunityMonthlyEstimate.create({
      data: {
        id: i,
        client_id: i,
        period: periods[i - 1],
        weighted_revenue_amount: round(15000 + i * 4200 + (i % 3) * 1800),
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.resource.create({
      data: {
        id: i,
        name: owners[i - 1],
        level: levels[(i - 1) % levels.length],
        utilization_target_pct: [70, 75, 80, 85, 75, 80, 70, 85, 80, 75, 80, 85][i - 1],
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.revenueForecast.create({
      data: {
        id: i,
        client_id: i,
        period: periods[i - 1],
        forecast_revenue_amount: round(40000 + i * 8500),
      },
    });
    await prisma.revenueActual.create({
      data: {
        id: i,
        client_id: i,
        period: periods[i - 1],
        actual_revenue_amount: round(36000 + i * 7800 + (i % 4) * 1200),
      },
    });
    await prisma.billedInvoice.create({
      data: {
        id: i,
        client_id: i,
        period: periods[i - 1],
        billed_invoice_amount: round(34000 + i * 7600),
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.managedRevenueYTD.create({
      data: {
        id: i,
        project_manager: owners[i - 1],
        revenue: round(120000 + i * 18500),
      },
    });
    await prisma.salesRevenueYTD.create({
      data: {
        id: i,
        project_manager: owners[i - 1],
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    const toDateRevenue = round(90000 + i * 22000);
    const toDateCost = round(toDateRevenue * (0.55 + (i % 5) * 0.03));
    const toDateMargin = round(toDateRevenue - toDateCost);
    const forecastRevenue = round(toDateRevenue * 1.35);
    const forecastCost = round(forecastRevenue * (0.52 + (i % 4) * 0.025));
    const forecastMargin = round(forecastRevenue - forecastCost);
    await prisma.projectProfitability.create({
      data: {
        id: i,
        project_id: i,
        client_id: i,
        billing_type: billingTypes[(i - 1) % billingTypes.length],
        to_date_revenue: toDateRevenue,
        to_date_cost: toDateCost,
        to_date_margin: toDateMargin,
        to_date_margin_pct: round((toDateMargin / toDateRevenue) * 100),
        forecast_revenue: forecastRevenue,
        forecast_cost: forecastCost,
        forecast_margin: forecastMargin,
        forecast_margin_pct: round((forecastMargin / forecastRevenue) * 100),
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    const forecasted = 65 + (i % 6) * 4;
    const actual = forecasted - 5 + (i % 4) * 3;
    await prisma.utilizationMonthly.create({
      data: {
        id: i,
        resource_id: i,
        period: periods[i - 1],
        forecasted_utilization_pct: forecasted,
        actual_utilization_pct: actual,
      },
    });
    const capacity = 1600;
    const actualHours = round(capacity * (actual / 100));
    await prisma.utilizationYTD.create({
      data: {
        id: i,
        resource_id: i,
        utilization_target_type: i % 2 === 0 ? "Billable" : "Productive",
        capacity_hours_ytd: capacity,
        actual_hours_ytd: actualHours,
        utilization_ytd: round((actualHours / capacity) * 100),
      },
    });
    await prisma.billedRevenueByResource.create({
      data: {
        id: i,
        resource_id: i,
        level: levels[(i - 1) % levels.length],
        effective_revenue: round(45000 + i * 9500),
      },
    });
  }

  for (let i = 1; i <= 12; i++) {
    await prisma.consolidatedFinancialEntry.create({
      data: {
        id: i,
        type: financialTypes[(i - 1) % financialTypes.length],
        name: `${financialTypes[(i - 1) % financialTypes.length]} — ${periods[i - 1]}`,
        period: periods[i - 1],
        amount: round((i % 2 === 0 ? 1 : -1) * (25000 + i * 11000)),
      },
    });
  }

  console.log("Seeded 12 rows for every Continuum Fabric table.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
