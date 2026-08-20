import { PrismaClient } from "./generated/prisma/client";

interface TrackOverageInput {
  meterId: number;
  currentValue: number;
  thresholdValue: number;
  unit: "kVA" | "kW";
  recordedAt: Date;
}

// Maintains one open OverageEvent per meter while its value stays above threshold,
// accumulating excess unit-hours incrementally on every reading — not just at close —
// so the dashboard can show a live, currently-running duration and penalty estimate.
export async function trackOverage(prisma: PrismaClient, input: TrackOverageInput) {
  const { meterId, currentValue, thresholdValue, unit, recordedAt } = input;
  const isOver = currentValue >= thresholdValue;

  const openEvent = await prisma.overageEvent.findFirst({
    where: { meterId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (isOver) {
    if (!openEvent) {
      await prisma.overageEvent.create({
        data: {
          meterId,
          startedAt: recordedAt,
          lastSampleAt: recordedAt,
          thresholdValue,
          peakValue: currentValue,
          excessUnitHours: 0,
          unit,
        },
      });
      return;
    }

    const hoursSinceLastSample = Math.max(
      0,
      (recordedAt.getTime() - openEvent.lastSampleAt.getTime()) / (1000 * 60 * 60)
    );
    // Excess at this sample × time elapsed since the last one — a simple, defensible
    // approximation of the excess-kVAh/kWh area, accurate enough at typical ingestion
    // cadences (seconds to minutes) without needing exact interval-by-interval shape.
    const excessNow = Math.max(0, currentValue - thresholdValue);
    const addedExcessUnitHours = excessNow * hoursSinceLastSample;

    await prisma.overageEvent.update({
      where: { id: openEvent.id },
      data: {
        lastSampleAt: recordedAt,
        peakValue: Math.max(openEvent.peakValue, currentValue),
        excessUnitHours: openEvent.excessUnitHours + addedExcessUnitHours,
      },
    });
  } else if (openEvent) {
    await prisma.overageEvent.update({
      where: { id: openEvent.id },
      data: { endedAt: recordedAt, lastSampleAt: recordedAt },
    });
  }
}