import { prisma } from "@/lib/prisma";

const RANGE_TO_HOURS: Record<string, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const RANGE_TO_BUCKET_MINUTES: Record<string, number> = { "24h": 15, "7d": 120, "30d": 480 };

export type PowerTrendRange = "24h" | "7d" | "30d";

export interface PowerTrendPoint {
  time: string;
  totalPowerKw: number;
}

// General-purpose version — same bucket-snapshot algorithm as before, now reusable
// for arbitrary date ranges (e.g. "yesterday") instead of only "since now minus N hours."
export async function getPowerTrendForRange(from: Date, to: Date, bucketMinutes: number): Promise<PowerTrendPoint[]> {
  const bucketMs = bucketMinutes * 60 * 1000;

  const readings = await prisma.reading.findMany({
    where: { recordedAt: { gte: from, lte: to } },
    select: { meterId: true, powerKw: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  if (readings.length === 0) return [];

  const latestByMeter = new Map<number, number>();
  const points: PowerTrendPoint[] = [];
  let bucketStart = Math.floor(readings[0].recordedAt.getTime() / bucketMs) * bucketMs;

  function snapshot(bucketStartMs: number) {
    const total = Array.from(latestByMeter.values()).reduce((sum, p) => sum + p, 0);
    points.push({ time: new Date(bucketStartMs).toISOString(), totalPowerKw: Number(total.toFixed(3)) });
  }

  for (const reading of readings) {
    const readingBucket = Math.floor(reading.recordedAt.getTime() / bucketMs) * bucketMs;
    while (readingBucket > bucketStart) {
      snapshot(bucketStart);
      bucketStart += bucketMs;
    }
    latestByMeter.set(reading.meterId, reading.powerKw);
  }

  snapshot(bucketStart);
  return points;
}

export async function getPowerTrend(range: PowerTrendRange): Promise<PowerTrendPoint[]> {
  const hours = RANGE_TO_HOURS[range] ?? 24;
  const bucketMinutes = RANGE_TO_BUCKET_MINUTES[range] ?? 15;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return getPowerTrendForRange(since, new Date(), bucketMinutes);
}

export interface TransformerTrendPoint {
  time: string;
  kva: number;
}

export async function getTransformerTrendsForRange(from: Date, to: Date, bucketMinutes: number): Promise<Record<number, TransformerTrendPoint[]>> {
  const bucketMs = bucketMinutes * 60 * 1000;

  const meters = await prisma.meter.findMany({
    where: { type: "transformer" },
    select: { id: true }
  });
  
  if (meters.length === 0) return {};
  
  const meterIds = meters.map(m => m.id);

  const readings = await prisma.reading.findMany({
    where: { meterId: { in: meterIds }, recordedAt: { gte: from, lte: to } },
    select: { meterId: true, voltage: true, current: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  const trends: Record<number, TransformerTrendPoint[]> = {};
  for (const id of meterIds) trends[id] = [];
  
  if (readings.length === 0) return trends;

  const latestByMeter = new Map<number, number>(); // meterId -> kva
  let bucketStart = Math.floor(readings[0].recordedAt.getTime() / bucketMs) * bucketMs;

  function snapshot(bucketStartMs: number) {
    const timeIso = new Date(bucketStartMs).toISOString();
    for (const id of meterIds) {
      trends[id].push({
        time: timeIso,
        kva: Number((latestByMeter.get(id) ?? 0).toFixed(1))
      });
    }
  }

  for (const reading of readings) {
    const readingBucket = Math.floor(reading.recordedAt.getTime() / bucketMs) * bucketMs;
    while (readingBucket > bucketStart) {
      snapshot(bucketStart);
      bucketStart += bucketMs;
    }
    const kva = (Math.sqrt(3) * reading.voltage * reading.current) / 1000;
    latestByMeter.set(reading.meterId, kva);
  }

  snapshot(bucketStart);
  return trends;
}