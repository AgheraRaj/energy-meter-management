import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateThresholds } from "@/lib/alerts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  if (!Number.isInteger(meterId) || meterId < 1) {
    return NextResponse.json({ error: "Invalid meter id" }, { status: 400 });
  }

  const range = request.nextUrl.searchParams.get("range") ?? "today";
  const now = new Date();
  let from: Date;
  let to = now;

  if (range === "custom") {
    const fromValue = request.nextUrl.searchParams.get("from");
    const toValue = request.nextUrl.searchParams.get("to");
    from = fromValue ? new Date(fromValue) : new Date("");
    to = toValue ? new Date(toValue) : new Date("");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ error: "Provide a valid start and end date/time range." }, { status: 400 });
    }
  } else {
    from = new Date(now);
    if (range === "monthly") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "yearly") {
      from = new Date(now.getFullYear(), 0, 1);
    } else {
      from.setHours(0, 0, 0, 0);
    }
  }

  const readings = await prisma.reading.findMany({
    where: {
      meterId,
      recordedAt: { gte: from, lte: to },
    },
    orderBy: { recordedAt: "asc" },
  });

  const maxPoints = 720;
  const step = Math.ceil(readings.length / maxPoints);
  const sampled = step > 1
    ? readings.filter((_, index) => index % step === 0 || index === readings.length - 1)
    : readings;

  return NextResponse.json(sampled);
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
