import { NextResponse } from "next/server";
import { toFloat, toInt, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  try {
    const updated = await prisma.billedRevenueByResource.update({
      where: { id },
      data: {
        resource_id: toInt(body.resource_id),
        level: toStr(body.level),
        effective_revenue: toFloat(body.effective_revenue),
        is_edited: true,
      },
      include: { resource: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
