import { Meter, Reading } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type MeterWithReadings = Meter & {
  readings: Reading[];
};

export function serializeMeter(meter: MeterWithReadings) {
  const { readings, location, feederCode, parentMeterId, ...rest } = meter;
  const latest = readings[0];
  return {
    ...rest,
    location: location ?? "",
    feederCode: feederCode ?? null,
    parentMeterId: parentMeterId ?? null,
    latestReading: latest
      ? {
          id: latest.id,
          meterId: latest.meterId,
          voltage: latest.voltage,
          current: latest.current,
          powerKw: latest.powerKw,
          energyKwh: latest.energyKwh,
          thd: latest.thd ?? null,
          recordedAt: latest.recordedAt.toISOString(),
        }
      : null,
  };
}

export async function getMeters(type?: "transformer" | "equipment") {
  const meters = await prisma.meter.findMany({
    where: type ? { type } : undefined,
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return meters.map(serializeMeter);
}

/** Fetch transformer meters with their child equipment meters nested */
export async function getTransformersWithChildren() {
  const transformers = await prisma.meter.findMany({
    where: { type: "transformer" },
    include: {
      readings: { orderBy: { recordedAt: "desc" }, take: 1 },
      childMeters: {
        include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return transformers.map((tr) => ({
    ...serializeMeter(tr),
    children: tr.childMeters.map(serializeMeter),
  }));
}