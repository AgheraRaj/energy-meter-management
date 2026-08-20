import { PrismaClient, Meter, Reading } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";
import { trackOverage } from "./overage";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical" | "normal";
  value: number;
}

export async function createAlert(prisma: PrismaClient, input: CreateAlertInput) {
  const alert = await prisma.alert.create({
    data: { meterId: input.meterId, message: input.message, severity: input.severity, value: input.value },
  });

  const meter = { id: input.meterId, name: input.meterName };
  if (alert.severity !== "normal") {
    const alertForNotif = alert as any;
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
  // Overage/penalty tracking uses the meter's own critical threshold specifically —
  // independent of the plant-wide alarm/alert severity classification below.
  if (meter.maxPowerKw != null) {
    await trackOverage(prisma, {
      meterId: meter.id,
      currentValue: reading.powerKw,
      thresholdValue: meter.maxPowerKw,
      unit: "kW",
      recordedAt: reading.recordedAt,
    });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) return;

  const powerKw = Number(reading.powerKw);
  const alertThreshold = Number(settings.alertSetpointKw ?? Infinity);
  const alarmThreshold = Number(settings.alarmSetpointKw ?? Infinity);
  const meterMaxThreshold = meter.maxPowerKw != null ? Number(meter.maxPowerKw) : null;

  const thresholds = [
    meterMaxThreshold,
    Number.isFinite(alertThreshold) ? alertThreshold : null,
    Number.isFinite(alarmThreshold) ? alarmThreshold : null,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  if (thresholds.length === 0) return;

  const limit = Math.min(...thresholds);
  if (powerKw >= limit) {
    const severity = powerKw >= alertThreshold ? "critical" : "warning";
    const message =
      powerKw >= alertThreshold
        ? `Power ${powerKw.toFixed(2)} kW exceeded alert threshold (${alertThreshold.toFixed(1)} kW)`
        : `Power ${powerKw.toFixed(2)} kW exceeded alarm threshold (${alarmThreshold.toFixed(1)} kW)`;

    await createAlert(prisma, { meterId: meter.id, meterName: meter.name, message, severity, value: powerKw });
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
    const message =
      kva >= alertThreshold
        ? `Loading ${kva.toFixed(0)} kVA exceeded alert threshold (${alertThreshold.toFixed(0)} kVA)`
        : `Loading ${kva.toFixed(0)} kVA exceeded alarm threshold (${alarmThreshold.toFixed(0)} kVA)`;

    await createAlert(prisma, { meterId: meter.id, meterName: meter.name, message, severity, value: kva });
  }
}

export async function evaluateThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  if (meter.type === "transformer") return evaluateTransformerThresholds(prisma, meter, reading);
  return evaluateEquipmentThresholds(prisma, meter, reading);
}