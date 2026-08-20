import { prisma } from "@/lib/prisma";

export interface OverageSummaryRow {
  meterId: number;
  meterName: string;
  code: string | null;
  unit: "kVA" | "kW";
  thresholdValue: number;
  peakValue: number;
  isCurrentlyOver: boolean;
  currentEventStartedAt: string | null;
  totalOverageHours: number;
  totalExcessUnitHours: number;
  estimatedPenalty: number;
  // For equipment: additional billing cost from energy drawn above setpoint
  // (excess kWh × normal energy rate). For transformers this mirrors estimatedPenalty.
  additionalBillingImpact: number;
}

async function summarizeMeterType(
  meterType: "transformer" | "equipment",
  periodStart: Date,
  periodEnd: Date,
  penaltyRate: number,
  energyRate: number
): Promise<OverageSummaryRow[]> {
  const meters = await prisma.meter.findMany({ where: { type: meterType } });
  if (meters.length === 0) return [];

  const meterIds = meters.map((m) => m.id);
  const now = new Date();

  const events = await prisma.overageEvent.findMany({
    where: {
      meterId: { in: meterIds },
      startedAt: { lte: periodEnd },
      OR: [{ endedAt: null }, { endedAt: { gte: periodStart } }],
    },
  });

  return meters
    .map((meter) => {
      const meterEvents = events.filter((e) => e.meterId === meter.id);
      const openEvent = meterEvents.find((e) => e.endedAt === null) ?? null;

      let totalHours = 0;
      let totalExcessUnitHours = 0;
      let peakValue = 0;

      for (const event of meterEvents) {
        const start = event.startedAt < periodStart ? periodStart : event.startedAt;
        const end = (event.endedAt ?? now) > periodEnd ? periodEnd : event.endedAt ?? now;
        totalHours += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        totalExcessUnitHours += event.excessUnitHours;
        if (event.peakValue > peakValue) peakValue = event.peakValue;
      }

      const threshold = meterType === "transformer" ? meter.alertSetpointKva : meter.maxPowerKw;
      const estimatedPenalty = Number((totalExcessUnitHours * penaltyRate).toFixed(2));
      // Additional billing impact: for equipment, excess kWh also appears on the normal
      // energy bill — show this separately so operators can see the full cost exposure.
      const additionalBillingImpact =
        meterType === "equipment"
          ? Number((totalExcessUnitHours * energyRate).toFixed(2))
          : estimatedPenalty; // for transformers, the penalty IS the billing impact

      return {
        meterId: meter.id,
        meterName: meter.name,
        code: meter.code,
        unit: (meterType === "transformer" ? "kVA" : "kW") as "kVA" | "kW",
        thresholdValue: threshold ?? 0,
        peakValue: Number(peakValue.toFixed(1)),
        isCurrentlyOver: openEvent !== null,
        currentEventStartedAt: openEvent ? openEvent.startedAt.toISOString() : null,
        totalOverageHours: Number(totalHours.toFixed(2)),
        totalExcessUnitHours: Number(totalExcessUnitHours.toFixed(2)),
        estimatedPenalty,
        additionalBillingImpact,
      };
    })
    .filter((row) => row.thresholdValue > 0); // only meters with a configured critical setpoint
}

export async function getOverageSummary() {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = now;

  const [transformers, equipment] = await Promise.all([
    summarizeMeterType("transformer", periodStart, periodEnd, settings.transformerPenaltyRatePerKvah, settings.ratePerKwh),
    summarizeMeterType("equipment", periodStart, periodEnd, settings.equipmentPenaltyRatePerKwh, settings.ratePerKwh),
  ]);

  return { transformers, equipment, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() };
}