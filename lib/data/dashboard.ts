import { prisma } from "@/lib/prisma";
import { getMeters } from "@/lib/data/meters";
import { generateReport } from "@/lib/reports";
import { getPowerTrendForRange } from "@/lib/dashboard";
import { getOverageSummary } from "@/lib/data/overage";
import { getBillingCycleSummary } from "@/lib/data/billing-cycle";

async function getDemandComparison() {
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const [todayPoints, yesterdayPoints] = await Promise.all([
    getPowerTrendForRange(new Date(now.getTime() - oneDayMs), now, 15),
    getPowerTrendForRange(new Date(now.getTime() - 2 * oneDayMs), new Date(now.getTime() - oneDayMs), 15),
  ]);

  const avg = (pts: { totalPowerKw: number }[]) =>
    pts.length ? pts.reduce((sum, p) => sum + p.totalPowerKw, 0) / pts.length : 0;

  return {
    todayAvg: Number(avg(todayPoints).toFixed(1)),
    yesterdayAvg: Number(avg(yesterdayPoints).toFixed(1)),
  };
}

async function getMeterMonthlyPeaks(meterIds: number[]): Promise<Record<number, number>> {
  if (meterIds.length === 0) return {};
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const peaks = await prisma.reading.groupBy({
    by: ["meterId"],
    where: { meterId: { in: meterIds }, recordedAt: { gte: startOfMonth } },
    _max: { powerKw: true },
  });

  const map: Record<number, number> = {};
  peaks.forEach((p) => {
    map[p.meterId] = p._max.powerKw ?? 0;
  });
  return map;
}

export async function getDashboardData() {
  const [meters, alertRows, settings, last24hReport, todayReport, demandComparison, overageSummary] =
    await Promise.all([
      getMeters(),
      prisma.alert.findMany({ include: { meter: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
      generateReport(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
      generateReport(new Date(new Date().setHours(0, 0, 0, 0)), new Date()),
      getDemandComparison(),
      getOverageSummary(),
    ]);

  const alerts = alertRows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
  const thresholdMeterIds = meters.filter((m) => m.maxPowerKw !== null).map((m) => m.id);
  const monthlyPeaks = await getMeterMonthlyPeaks(thresholdMeterIds);
  const billingCycle = await getBillingCycleSummary(settings.billingCycleAnchorDate);

  return {
    meters,
    alerts,
    settings,
    last24hReport,
    todayEnergyKwh: todayReport.totalConsumptionKwh,
    demandComparison,
    monthlyPeaks,
    overageSummary,
    billingCycle,
  };
}