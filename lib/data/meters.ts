import { prisma } from "@/lib/prisma";
import { MeterWithReading } from "@/lib/types";

export async function getMeters(): Promise<MeterWithReading[]> {
  const meters = await prisma.meter.findMany({
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return meters.map(({ readings, ...meter }) => ({
    ...meter,
    location: meter.location ?? "",
    latestReading: readings[0]
      ? { ...readings[0], recordedAt: readings[0].recordedAt.toISOString() }
      : null,
  }));
}