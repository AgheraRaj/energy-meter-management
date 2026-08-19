import { PrismaClient, Meter, Reading } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical" | "normal";
  value: number;
}

export async function createAlert(prisma: PrismaClient, input: CreateAlertInput) {
  const alert = await prisma.alert.create({
    data: {
      meterId: input.meterId,
      message: input.message,
      severity: input.severity,
      value: input.value,
    },
  });

  const meter = { id: input.meterId, name: input.meterName };
  // Only critical alerts go to email — warnings surface as in-app/socket
  // notifications only, per the plant's alerting policy.
  if (alert.severity === "critical") {
    const alertForNotif = alert as any;
    notifyCriticalAlertByEmail(alertForNotif, meter).catch((err) =>
      console.error("Unexpected error in notifyCriticalAlertByEmail:", err)
    );
  }

  const io = (global as any).io;
  if (io) {
    io.emit("alert:new", { ...alert, meter: { name: input.meterName } });
  }

  return alert;
}

type ThresholdMeter = Pick<Meter, "id" | "name" | "type" | "maxPowerKw" | "minPowerKw" | "status" | "alarmSetpointKva" | "alertSetpointKva">;
type ThresholdReading = Pick<Reading, "meterId" | "powerKw" | "voltage" | "current">;

async function evaluateEquipmentThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  const powerKw = Number(reading.powerKw);
  const meterMaxThreshold = meter.maxPowerKw != null ? Number(meter.maxPowerKw) : null;

  if (meterMaxThreshold === null || powerKw < meterMaxThreshold) return;

  const message = `Power ${powerKw.toFixed(2)} kW exceeded equipment threshold (${meterMaxThreshold.toFixed(1)} kW)`;
  await createAlert(prisma, { meterId: meter.id, meterName: meter.name, message, severity: "warning", value: powerKw });
}

// Transformers are evaluated against their own kVA-based setpoints, not the
// plant-wide kW settings — a transformer with no setpoints configured simply
// isn't checked, rather than silently inheriting a plant-level threshold that
// isn't meaningful in kVA terms.
async function evaluateTransformerThresholds(prisma: PrismaClient, meter: ThresholdMeter, reading: ThresholdReading) {
  if (meter.alarmSetpointKva == null && meter.alertSetpointKva == null) return;

  const kva = (Math.sqrt(3) * reading.voltage * reading.current) / 1000;
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
  if (meter.type === "transformer") {
    return evaluateTransformerThresholds(prisma, meter, reading);
  }
  return evaluateEquipmentThresholds(prisma, meter, reading);
}