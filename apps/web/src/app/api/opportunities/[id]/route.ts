import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const id = Number((await params).id);
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(opportunity);
}

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let probability = toFloat(body.probability);
  if (probability != null && probability > 1) probability = probability / 100;
  const total = toFloat(body.total_revenue);
  const weighted =
    toFloat(body.weighted_revenue) ??
    (probability != null && total != null ? probability * total : null);

  try {
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
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
        is_edited: true,
      },
      include: { client: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
