import { PrismaClient, Meter, Reading } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";
import { trackOverage } from "./overage";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical" | "normal";
  value: number;
  thresholdValue?: number;
  unit?: string;
}

export async function createAlert(prisma: PrismaClient, input: CreateAlertInput) {
  const alert = await prisma.alert.create({
    data: { meterId: input.meterId, message: input.message, severity: input.severity, value: input.value },
  });

  const meter = { id: input.meterId, name: input.meterName };
  if (alert.severity !== "normal") {
    const alertForNotif = { ...alert, thresholdValue: input.thresholdValue, unit: input.unit } as any;
    notifyCriticalAlertByEmail(alertForNotif, meter).catch((err) =>
      console.error("Unexpected error in notifyCriticalAlertByEmail:", err)
    );
  }

  const io = (global as any).io;
  if (io) io.emit("alert:new", { ...alert, meter: { name: input.meterName } });

  return alert;
}

type ThresholdMeter = Pick<Meter, "id" | "name" | "type" | "maxPowerKw" | "minPowerKw" | "status" | "alarmSetpointKva" | "alertSetpointKva">;
type ThresholdReading = Pick<Reading, "meterId" | "powerKw" | "voltage" | "current" | "recordedAt">;

async function evaluateEquipmentThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  // Overage/penalty tracking — unchanged, still keyed off the equipment's own threshold.
  if (meter.maxPowerKw != null) {
    await trackOverage(prisma, {
      meterId: meter.id,
      currentValue: reading.powerKw,
      thresholdValue: meter.maxPowerKw,
      unit: "kW",
      recordedAt: reading.recordedAt,
    });
  }

  // Breaching this specific equipment's own configured threshold is always
  // Critical — this is the equipment's own operating limit, not a soft warning band.
  if (meter.maxPowerKw != null && reading.powerKw >= meter.maxPowerKw) {
    const message = `Power ${reading.powerKw.toFixed(2)} kW exceeded configured threshold of ${meter.maxPowerKw.toFixed(1)} kW`;
    await createAlert(prisma, {
      meterId: meter.id,
      meterName: meter.name,
      message,
      severity: "critical",
      value: reading.powerKw,
      thresholdValue: meter.maxPowerKw,
      unit: "kW",
    });
  }
}

async function evaluateTransformerThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  if (meter.alarmSetpointKva == null && meter.alertSetpointKva == null) return;

  const kva = (Math.sqrt(3) * reading.voltage * reading.current) / 1000;

  if (meter.alertSetpointKva != null) {
    await trackOverage(prisma, {
      meterId: meter.id,
      currentValue: kva,
      thresholdValue: meter.alertSetpointKva,
      unit: "kVA",
      recordedAt: reading.recordedAt,
    });
  }

  const alertThreshold = meter.alertSetpointKva ?? Infinity;
  const alarmThreshold = meter.alarmSetpointKva ?? Infinity;
  const limit = Math.min(alertThreshold, alarmThreshold);

  if (kva >= limit) {
    const severity = kva >= alertThreshold ? "critical" : "warning";
    const thresholdValue = kva >= alertThreshold ? alertThreshold : alarmThreshold;
    const message =
      kva >= alertThreshold
        ? `Loading ${kva.toFixed(0)} kVA exceeded alert threshold (${alertThreshold.toFixed(0)} kVA)`
        : `Loading ${kva.toFixed(0)} kVA exceeded alarm threshold (${alarmThreshold.toFixed(0)} kVA)`;

    await createAlert(prisma, {
      meterId: meter.id,
      meterName: meter.name,
      message,
      severity,
      value: kva,
      thresholdValue,
      unit: "kVA",
    });
  }
}

export async function evaluateThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  if (meter.type === "transformer") return evaluateTransformerThresholds(prisma, meter, reading);
  return evaluateEquipmentThresholds(prisma, meter, reading);
}