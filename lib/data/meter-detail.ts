import { prisma } from "@/lib/prisma";

async function getConsumptionForWindow(meterId: number, from: Date, to: Date) {
  const [first, last] = await Promise.all([
    prisma.reading.findFirst({
      where: { meterId, recordedAt: { gte: from, lte: to } },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.reading.findFirst({
      where: { meterId, recordedAt: { gte: from, lte: to } },
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  if (!first || !last) return null; // no data in this window — not the same as 0 consumed
  return Number((last.energyKwh - first.energyKwh).toFixed(3));
}

export async function getMeterDetail(meterId: number) {
  const meter = await prisma.meter.findUnique({
    where: { id: meterId },
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 20 } },
  });

  if (!meter) return null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayKwh, weekKwh, monthKwh, settings] = await Promise.all([
    getConsumptionForWindow(meterId, startOfToday, now),
    getConsumptionForWindow(meterId, startOfWeek, now),
    getConsumptionForWindow(meterId, startOfMonth, now),
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        ratePerKwh: 8.5,
        alarmSetpointKw: 1400.0,
        alertSetpointKw: 1450.0,
      },
    }),
  ]);

  const { readings, ...meterFields } = meter;
  const latestReading = readings[0] ?? null;

  return {
    meter: { ...meterFields, location: meterFields.location ?? "" },
    latestReading: latestReading
      ? { ...latestReading, recordedAt: latestReading.recordedAt.toISOString() }
      : null,
    recentReadings: readings.map((r) => ({ ...r, recordedAt: r.recordedAt.toISOString() })),
    consumption: { today: todayKwh, week: weekKwh, month: monthKwh },
    ratePerKwh: settings.ratePerKwh,
  };
}