import { NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { id: "asc" },
    include: { client: true },
  });
  return NextResponse.json(opportunities);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  let probability = toFloat(body.probability);
  // Accept either 0–1 or 0–100 from forms/API clients
  if (probability != null && probability > 1) probability = probability / 100;
  const total = toFloat(body.total_revenue);
  const weighted =
    toFloat(body.weighted_revenue) ??
    (probability != null && total != null ? probability * total : null);

  const id = body.id != null ? Number(body.id) : await nextId(prisma.opportunity);
  const created = await prisma.opportunity.create({
    data: {
      id,
      client_id: toInt(body.client_id),
      name,
      stage: toStr(body.stage),
      owner: toStr(body.owner),
      updated_on: toStr(body.updated_on),
      start_date: toStr(body.start_date),
      finish_date: toStr(body.finish_date),
      probability,
      total_revenue: total,
      weighted_revenue: weighted,
    },
    include: { client: true },
  });
  return NextResponse.json(created, { status: 201 });
}
