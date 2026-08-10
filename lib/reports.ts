import { prisma } from "@/lib/prisma";

export interface MeterReportRow {
  meterId: number;
  meterName: string;
  startKwh: number;
  endKwh: number;
  consumptionKwh: number;
  cost: number;
}

export interface ReportResult {
  from: string;
  to: string;
  ratePerKwh: number;
  rows: MeterReportRow[];
  totalConsumptionKwh: number;
  totalCost: number;
}

export async function generateReport(from: Date, to: Date): Promise<ReportResult> {
  const [meters, settings] = await Promise.all([
    prisma.meter.findMany(),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ratePerKwh: 8.5 } }),
  ]);

  const rows: MeterReportRow[] = [];

  for (const meter of meters) {
    // Earliest reading at/after `from`, latest reading at/before `to`.
    const [firstReading, lastReading] = await Promise.all([
      prisma.reading.findFirst({
        where: { meterId: meter.id, recordedAt: { gte: from, lte: to } },
        orderBy: { recordedAt: "asc" },
      }),
      prisma.reading.findFirst({
        where: { meterId: meter.id, recordedAt: { gte: from, lte: to } },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    if (!firstReading || !lastReading) continue; // no data for this meter in range

    const consumptionKwh = Number((lastReading.energyKwh - firstReading.energyKwh).toFixed(3));
    const cost = Number((consumptionKwh * settings.ratePerKwh).toFixed(2));

    rows.push({
      meterId: meter.id,
      meterName: meter.name,
      startKwh: firstReading.energyKwh,
      endKwh: lastReading.energyKwh,
      consumptionKwh,
      cost,
    });
  }

  const totalConsumptionKwh = Number(rows.reduce((sum, r) => sum + r.consumptionKwh, 0).toFixed(3));
  const totalCost = Number(rows.reduce((sum, r) => sum + r.cost, 0).toFixed(2));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    ratePerKwh: settings.ratePerKwh,
    rows,
    totalConsumptionKwh,
    totalCost,
  };
}