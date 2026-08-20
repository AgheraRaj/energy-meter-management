import { prisma } from "@/lib/prisma";
import { getMeters } from "@/lib/data/meters";
import { generateReport } from "@/lib/reports";
import { getPlantPeakDemandKva } from "@/lib/dashboard";
import { getOverageSummary } from "@/lib/data/overage";
import { getBillingCycleSummary } from "@/lib/data/billing-cycle";

async function getMeterMonthlyPeaks(meterIds: number[], startDate: Date): Promise<Record<number, number>> {
  if (meterIds.length === 0) return {};

  const peaks = await prisma.reading.groupBy({
    by: ["meterId"],
    where: { meterId: { in: meterIds }, recordedAt: { gte: startDate } },
    _max: { powerKw: true },
  });

  const map: Record<number, number> = {};
  peaks.forEach((p) => {
    map[p.meterId] = p._max.powerKw ?? 0;
  });
  return map;
}

export async function getDashboardData(filter: "today" | "billing" = "today") {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  
  const now = new Date();
  
  // Get billing cycle for settings
  const billingCycle = await getBillingCycleSummary(settings.billingCycleAnchorDate);

  let periodStart = new Date(now.setHours(0, 0, 0, 0));
  let periodEnd = new Date();

  if (filter === "billing" && billingCycle) {
    periodStart = new Date(billingCycle.start);
    periodEnd = new Date(billingCycle.end);
    if (periodEnd > new Date()) periodEnd = new Date();
  }

  const [meters, alertRows, last24hReport, periodReport, peakPlantDemandKva, overageSummary] =
    await Promise.all([
      getMeters(),
      prisma.alert.findMany({ include: { meter: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
      generateReport(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
      generateReport(periodStart, periodEnd),
      getPlantPeakDemandKva(periodStart, periodEnd),
      getOverageSummary(periodStart, periodEnd),
    ]);

  const alerts = alertRows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
  const thresholdMeterIds = meters.filter((m) => m.maxPowerKw !== null).map((m) => m.id);
  
  // Use periodStart for peaks, but to match old behavior let's modify getMeterMonthlyPeaks
  // Wait, getMeterMonthlyPeaks is hardcoded to startOfMonth. Let's fix that inline or change the function.
  // We'll update the function above. Let's just pass periodStart to getMeterMonthlyPeaks.
  const monthlyPeaks = await getMeterMonthlyPeaks(thresholdMeterIds, periodStart);

  return {
    meters,
    alerts,
    settings,
    last24hReport,
    periodEnergyKwh: periodReport.totalConsumptionKwh,
    peakPlantDemandKva,
    monthlyPeaks,
    overageSummary,
    billingCycle,
    filter,
  };
}
