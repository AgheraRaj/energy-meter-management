import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

async function energyAt(meterId: number, at: Date) {
  return prisma.reading.findFirst({
    where: { meterId, recordedAt: { lte: at } },
    orderBy: { recordedAt: "desc" },
    select: { energyKwh: true },
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const meterId = Number(id);
  if (!Number.isInteger(meterId) || meterId < 1) {
    return NextResponse.json({ error: "Invalid meter id" }, { status: 400 });
  }

  const view = request.nextUrl.searchParams.get("view") === "7d" ? "7d" : "today";
  const now = new Date();
  const todayStart = startOfDay(now);

  if (view === "today") {
    const [baseline, readings] = await Promise.all([
      energyAt(meterId, todayStart),
      prisma.reading.findMany({
        where: { meterId, recordedAt: { gte: todayStart, lte: now } },
        select: { energyKwh: true, recordedAt: true },
        orderBy: { recordedAt: "asc" },
      }),
    ]);
    const baselineKwh = baseline?.energyKwh ?? readings[0]?.energyKwh ?? 0;
    return NextResponse.json({
      baselineKwh,
      data: readings.map((reading) => ({
        time: reading.recordedAt.toISOString(),
        kwh: Number(Math.max(0, reading.energyKwh - baselineKwh).toFixed(3)),
      })),
    });
  }

  const starts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const boundaries = [...starts, new Date(now)];
  const values = await Promise.all(boundaries.map((boundary) => energyAt(meterId, boundary)));
  const data = starts.map((start, index) => {
    const startKwh = values[index]?.energyKwh;
    const endKwh = values[index + 1]?.energyKwh;
    return {
      time: start.toISOString(),
      kwh: startKwh === undefined || endKwh === undefined
        ? null
        : Number(Math.max(0, endKwh - startKwh).toFixed(3)),
    };
  });

  return NextResponse.json({ data });
}
