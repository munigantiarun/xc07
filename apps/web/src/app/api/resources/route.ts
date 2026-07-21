import { NextResponse } from "next/server";
import { nextId, toFloat, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const resources = await prisma.resource.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(resources);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = body.id != null ? Number(body.id) : await nextId(prisma.resource);
  const created = await prisma.resource.create({
    data: {
      id,
      name,
      level: toStr(body.level),
      utilization_target_pct: toFloat(body.utilization_target_pct),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
