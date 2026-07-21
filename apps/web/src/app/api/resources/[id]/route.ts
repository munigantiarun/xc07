import { NextResponse } from "next/server";
import { toFloat, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const id = Number((await params).id);
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      utilizationMonthly: true,
      utilizationYtd: true,
      billedRevenueByResource: true,
    },
  });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resource);
}

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const updated = await prisma.resource.update({
      where: { id },
      data: {
        name,
        level: toStr(body.level),
        utilization_target_pct: toFloat(body.utilization_target_pct),
        is_edited: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
