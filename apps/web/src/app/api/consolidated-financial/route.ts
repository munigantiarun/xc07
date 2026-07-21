import { NextRequest, NextResponse } from "next/server";
import { nextId, toFloat, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const period = req.nextUrl.searchParams.get("period");
  const rows = await prisma.consolidatedFinancialEntry.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(period ? { period } : {}),
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id != null ? Number(body.id) : await nextId(prisma.consolidatedFinancialEntry);
  const created = await prisma.consolidatedFinancialEntry.create({
    data: {
      id,
      type: toStr(body.type),
      name: toStr(body.name),
      period: toStr(body.period),
      amount: toFloat(body.amount),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
