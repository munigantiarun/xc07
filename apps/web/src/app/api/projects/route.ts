import { NextResponse } from "next/server";
import { nextId, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { id: "asc" },
    include: { client: true },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = body.id != null ? Number(body.id) : await nextId(prisma.project);
  const created = await prisma.project.create({
    data: {
      id,
      name,
      client_id: toInt(body.client_id),
      billing_type: toStr(body.billing_type),
    },
    include: { client: true },
  });
  return NextResponse.json(created, { status: 201 });
}
