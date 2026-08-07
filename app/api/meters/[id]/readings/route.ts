import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);

  const readings = await prisma.reading.findMany({
    where: { meterId },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(readings);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  const body = await request.json();

  const reading = await prisma.reading.create({
    data: {
      meterId,
      voltage: body.voltage,
      current: body.current,
      powerKw: body.powerKw,
      energyKwh: body.energyKwh,
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
    },
  });

  return NextResponse.json(reading, { status: 201 });
}