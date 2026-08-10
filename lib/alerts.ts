import { PrismaClient, Reading, Meter } from "./generated/prisma/client";

export async function evaluateThresholds(
  prisma: PrismaClient,
  meter: Meter,
  reading: Reading
) {
  const breaches: { message: string; severity: "warning" | "critical"; value: number }[] = [];

  if (meter.maxPowerKw !== null && reading.powerKw > meter.maxPowerKw) {
    breaches.push({
      message: `Power ${reading.powerKw} kW exceeded max threshold of ${meter.maxPowerKw} kW`,
      severity: reading.powerKw > meter.maxPowerKw * 1.2 ? "critical" : "warning",
      value: reading.powerKw,
    });
  }

  if (meter.minPowerKw !== null && reading.powerKw < meter.minPowerKw) {
    breaches.push({
      message: `Power ${reading.powerKw} kW dropped below min threshold of ${meter.minPowerKw} kW`,
      severity: "warning",
      value: reading.powerKw,
    });
  }

  const createdAlerts = [];
  for (const breach of breaches) {
    const alert = await prisma.alert.create({
      data: { meterId: meter.id, ...breach },
    });
    createdAlerts.push(alert);
  }

  return createdAlerts;
}

