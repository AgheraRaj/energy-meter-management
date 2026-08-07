import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meter = await prisma.meter.findUnique({
    where: { id: Number(id) },
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  if (!meter) {
    return NextResponse.json({ error: "Meter not found" }, { status: 404 });
  }

  return NextResponse.json(meter);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const meter = await prisma.meter.update({
    where: { id: Number(id) },
    data: { name: body.name, location: body.location, status: body.status },
  });

  return NextResponse.json(meter);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  await prisma.meter.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}