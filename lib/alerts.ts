import { PrismaClient, Meter, Reading } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";
import { notifyCriticalAlertBySms } from "./notifications/sms";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical" | "normal";
  value: number;
}

// The single place an Alert row gets created — DB write, email + SMS notifications,
// and the live socket push all happen from here, regardless of what triggered it
// (threshold breach or the dummy-alert seeder).
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
  if (alert.severity !== "normal") {
    const alertForNotif = alert as any;
    notifyCriticalAlertBySms(alertForNotif, meter).catch((err) =>
      console.error("Unexpected error in notifyCriticalAlertBySms:", err)
    );
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

export async function evaluateThresholds(
  prisma: PrismaClient,
  meter: Pick<Meter, "id" | "name" | "maxPowerKw" | "minPowerKw" | "status">,
  reading: Pick<Reading, "meterId" | "powerKw">
) {
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

    await createAlert(prisma, {
      meterId: meter.id,
      meterName: meter.name,
      message,
      severity,
      value: powerKw,
    });
  }
}