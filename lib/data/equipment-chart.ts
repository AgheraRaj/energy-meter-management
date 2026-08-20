import { prisma } from "@/lib/prisma";

export type DashboardFilter = "today" | "billing";

export interface EquipmentChartData {
  energy: {
    data: { meterId: number; name: string; previousKwh: number; currentKwh: number }[];
    previousLabel: string;
    currentLabel: string;
  };
  peakPowerByMeter: Record<number, number>;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function billingCycleStart(anchorDate: Date, now: Date) {
  const billingDay = anchorDate.getDate();
  const dateForMonth = (year: number, month: number) =>
    new Date(year, month, Math.min(billingDay, new Date(year, month + 1, 0).getDate()));

  let start = dateForMonth(now.getFullYear(), now.getMonth());
  if (start > now) start = dateForMonth(now.getFullYear(), now.getMonth() - 1);
  return start;
}

async function consumptionBetween(meterId: number, from: Date, to: Date) {
  const [startReading, endReading] = await Promise.all([
    prisma.reading.findFirst({
      where: { meterId, recordedAt: { lte: from } },
      orderBy: { recordedAt: "desc" },
      select: { energyKwh: true },
    }),
    prisma.reading.findFirst({
      where: { meterId, recordedAt: { lte: to } },
      orderBy: { recordedAt: "desc" },
      select: { energyKwh: true },
    }),
  ]);

  if (!startReading || !endReading) return 0;
  return Number(Math.max(0, endReading.energyKwh - startReading.energyKwh).toFixed(3));
}

/** Data for the two equipment charts, derived from the meters' cumulative kWh readings. */
export async function getEquipmentChartData(
  filter: DashboardFilter,
  billingCycleAnchorDate: Date | null,
): Promise<EquipmentChartData> {
  const now = new Date();
  let previousStart: Date;
  let previousEnd: Date;
  let currentStart: Date;
  let previousLabel: string;
  let currentLabel: string;

  if (filter === "billing" && billingCycleAnchorDate) {
    currentStart = billingCycleStart(billingCycleAnchorDate, now);
    previousEnd = currentStart;
    previousStart = billingCycleStart(billingCycleAnchorDate, new Date(currentStart.getTime() - 1));
    previousLabel = "Previous billing period";
    currentLabel = "Current billing period";
  } else {
    currentStart = startOfDay(now);
    previousEnd = currentStart;
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 1);
    previousLabel = "Yesterday";
    currentLabel = "Today";
  }

  const equipment = await prisma.meter.findMany({
    where: { type: "equipment" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const [energy, peaks] = await Promise.all([
    Promise.all(
      equipment.map(async (meter) => {
        const [previousKwh, currentKwh] = await Promise.all([
          consumptionBetween(meter.id, previousStart, previousEnd),
          consumptionBetween(meter.id, currentStart, now),
        ]);
        return { meterId: meter.id, name: meter.code ?? meter.name, previousKwh, currentKwh };
      }),
    ),
    prisma.reading.groupBy({
      by: ["meterId"],
      where: { meter: { type: "equipment" }, recordedAt: { gte: currentStart, lte: now } },
      _max: { powerKw: true },
    }),
  ]);

  return {
    energy: { data: energy, previousLabel, currentLabel },
    peakPowerByMeter: Object.fromEntries(peaks.map((peak) => [peak.meterId, peak._max.powerKw ?? 0])),
  };
}
