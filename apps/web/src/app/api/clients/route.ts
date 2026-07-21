import { NextResponse } from "next/server";
import { nextId, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = body.id != null ? Number(body.id) : await nextId(prisma.client);
  const created = await prisma.client.create({ data: { id, name } });
  return NextResponse.json(created, { status: 201 });
}
