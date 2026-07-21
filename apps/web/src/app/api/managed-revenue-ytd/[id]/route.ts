import { NextResponse } from "next/server";
import { toFloat, toStr } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const id = Number((await params).id);
  const body = await req.json();
  try {
    const updated = await prisma.managedRevenueYTD.update({
      where: { id },
      data: {
        project_manager: toStr(body.project_manager),
        revenue: toFloat(body.revenue),
        is_edited: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
