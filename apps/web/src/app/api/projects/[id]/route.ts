import { NextResponse } from "next/server";
import { toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const id = Number((await params).id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, projectProfitabilities: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  const name = toStr(body.name);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        client_id: toInt(body.client_id),
        billing_type: toStr(body.billing_type),
        is_edited: true,
      },
      include: { client: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
