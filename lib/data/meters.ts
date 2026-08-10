import { Meter, Reading } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type MeterWithReadings = Meter & {
  readings: Reading[];
};

export function serializeMeter(meter: MeterWithReadings) {
  const { readings, location, ...rest } = meter;
  return {
    ...rest,
    location: location ?? "",
    latestReading: readings[0]
      ? { ...readings[0], recordedAt: readings[0].recordedAt.toISOString() }
      : null,
  };
}

export async function getMeters() {
  const meters = await prisma.meter.findMany({
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return meters.map(serializeMeter);
}