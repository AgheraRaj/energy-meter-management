import { prisma } from "@/lib/prisma";

const RANGE_TO_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

// Coarser buckets for longer ranges keep point counts chart-friendly
// (~90-100 points regardless of range) instead of plotting every raw sample.
const RANGE_TO_BUCKET_MINUTES: Record<string, number> = {
  "24h": 15,
  "7d": 120,
  "30d": 480,
};

export type PowerTrendRange = "24h" | "7d" | "30d";

export interface PowerTrendPoint {
  time: string;
  totalPowerKw: number;
}

export async function getPowerTrend(range: PowerTrendRange): Promise<PowerTrendPoint[]> {
  const hours = RANGE_TO_HOURS[range] ?? 24;
  const bucketMs = (RANGE_TO_BUCKET_MINUTES[range] ?? 15) * 60 * 1000;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const readings = await prisma.reading.findMany({
    where: { recordedAt: { gte: since } },
    select: { meterId: true, powerKw: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  if (readings.length === 0) return [];

  // Walk readings chronologically, tracking each meter's most recent power.
  // At every bucket boundary we snapshot the sum of "last known power per meter" —
  // this avoids double-counting a meter that reported multiple times in one bucket.
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