import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  const period = req.nextUrl.searchParams.get("period");
  const rows = await prisma.revenueActual.findMany({
    where: {
      ...(clientId ? { client_id: Number(clientId) } : {}),
      ...(period ? { period } : {}),
    },
    orderBy: { id: "asc" },
    include: { client: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id != null ? Number(body.id) : await nextId(prisma.revenueActual);
  const created = await prisma.revenueActual.create({
    data: {
      id,
      client_id: toInt(body.client_id),
      period: toStr(body.period),
      actual_revenue_amount: toFloat(body.actual_revenue_amount),
    },
    include: { client: true },
  });
  return NextResponse.json(created, { status: 201 });
}
