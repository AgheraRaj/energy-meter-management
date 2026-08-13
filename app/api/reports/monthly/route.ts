import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all meters
    const meters = await prisma.meter.findMany({
      orderBy: { name: "asc" },
    });

    const results = [];

    for (const meter of meters) {
      // 1. Get first and last reading of the month to calculate consumption
      const [firstReading, lastReading] = await Promise.all([
        prisma.reading.findFirst({
          where: { meterId: meter.id, recordedAt: { gte: startOfMonth } },
          orderBy: { recordedAt: "asc" },
        }),
        prisma.reading.findFirst({
          where: { meterId: meter.id, recordedAt: { gte: startOfMonth } },
          orderBy: { recordedAt: "desc" },
        }),
      ]);

      // 2. Get max power (peak demand) for the month
      const peakRow = await prisma.reading.findFirst({
        where: { meterId: meter.id, recordedAt: { gte: startOfMonth } },
        orderBy: { powerKw: "desc" },
      });

      const startKwh = firstReading?.energyKwh ?? 0;
      const endKwh = lastReading?.energyKwh ?? 0;
      const consumptionKwh = Math.max(0, endKwh - startKwh);
      const peakDemandKw = peakRow?.powerKw ?? 0;

      // Current live/latest values
      const currentPowerKw = lastReading?.powerKw ?? 0;
      const currentVoltage = lastReading?.voltage ?? 415;
      const currentCurrent = lastReading?.current ?? 0;
      const currentKva = (Math.sqrt(3) * currentVoltage * currentCurrent) / 1000;
      const currentPf = currentKva > 0 ? Math.min(1.0, currentPowerKw / currentKva) : 0.9;
      
      const rated = meter.ratedKw ?? 100;
      const loadPct = rated > 0 ? (currentPowerKw / rated) * 100 : 0;

      results.push({
        id: meter.id,
        code: meter.code,
        name: meter.name,
        type: meter.type,
        status: meter.status,
        ratedKw: rated,
        bus: meter.bus,
        feederCode: meter.feederCode,
        currentVoltage,
        currentCurrent,
        currentPowerKw,
        currentKva,
        currentPf,
        loadPct,
        monthlyConsumptionKwh: consumptionKwh,
        peakDemandKw,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Monthly reports aggregate API error:", error);
    return NextResponse.json({ error: "Failed to generate monthly reports data" }, { status: 500 });
  }
}
