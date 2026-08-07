import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const meters = await prisma.meter.findMany({
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const result = meters.map(({ readings, ...meter }) => ({
    ...meter,
    latestReading: readings[0] ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const meter = await prisma.meter.create({
    data: { name: body.name, location: body.location ?? null, status: body.status ?? "active" },
  });

  return NextResponse.json(meter, { status: 201 });
}