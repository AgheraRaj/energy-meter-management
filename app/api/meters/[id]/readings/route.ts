import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateThresholds } from "@/lib/alerts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const RANGE_TO_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  const range = request.nextUrl.searchParams.get("range") ?? "24h";
  const hours = RANGE_TO_HOURS[range] ?? 24;

  const readings = await prisma.reading.findMany({
    where: {
      meterId,
      recordedAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
    },
    orderBy: { recordedAt: "asc" }, // ascending for a chart, unlike the dashboard's "latest first"
  });

  return NextResponse.json(readings);
}


export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  const body = await request.json();

  const meter = await prisma.meter.findUnique({ where: { id: meterId } });
  if (!meter) {
    return NextResponse.json({ error: "Meter not found" }, { status: 404 });
  }

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

  await evaluateThresholds(prisma, meter, reading);

  return NextResponse.json(reading, { status: 201 });
}