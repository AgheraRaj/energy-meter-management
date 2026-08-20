import { prisma } from "@/lib/prisma";

export interface MeterReportRow {
  meterId: number;
  meterName: string;
  startKwh: number;
  endKwh: number;
  consumptionKwh: number;
  voltage: number;
  current: number;
  powerKw: number;
  apparentPowerKva: number;
  powerFactor: number;
  frequencyHz: number | null; // null when neither ingested nor derivable
  thd: number;
  loadPercent: number;
  cost: number;
  voltageR: number | null;
  voltageY: number | null;
  voltageB: number | null;
  currentR: number | null;
  currentY: number | null;
  currentB: number | null;
  powerKwR: number | null;
  powerKwY: number | null;
  powerKwB: number | null;
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

    const voltage = Number(lastReading.voltage ?? 415);
    const current = Number(lastReading.current ?? 0);
    const powerKw = Number(lastReading.powerKw ?? 0);

    // Prefer real ingested values; fall back to computed only when genuinely absent —
    // same convention established in lib/readings.ts for ingestion-time derivation.
    const apparentPowerKva =
      lastReading.apparentPowerKva ?? Number(((Math.sqrt(3) * voltage * current) / 1000).toFixed(3));
    const powerFactor =
      lastReading.powerFactor ?? (apparentPowerKva > 0 ? Number(Math.min(1.0, powerKw / apparentPowerKva).toFixed(3)) : 0.9);
    const frequencyHz = lastReading.frequencyHz ?? null; // no fabricated fallback
    const thd = Number(lastReading.thd ?? 0);
    const ratedKw = meter.ratedKw ?? 100;
    const loadPercent = ratedKw > 0 ? Number(((powerKw / ratedKw) * 100).toFixed(1)) : 0;

    rows.push({
      meterId: meter.id,
      meterName: meter.name,
      startKwh: firstReading.energyKwh,
      endKwh: lastReading.energyKwh,
      consumptionKwh,
      voltage,
      current,
      powerKw,
      apparentPowerKva,
      powerFactor,
      frequencyHz,
      thd,
      loadPercent,
      cost,
      voltageR: lastReading.voltageR,
      voltageY: lastReading.voltageY,
      voltageB: lastReading.voltageB,
      currentR: lastReading.currentR,
      currentY: lastReading.currentY,
      currentB: lastReading.currentB,
      powerKwR: lastReading.powerKwR,
      powerKwY: lastReading.powerKwY,
      powerKwB: lastReading.powerKwB,
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