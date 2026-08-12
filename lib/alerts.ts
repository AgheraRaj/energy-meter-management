import { PrismaClient, Reading, Meter } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";
import { notifyCriticalAlert } from "./notifications/whatsapp";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical";
  value: number;
}

// The single place an Alert row gets created — DB write, WhatsApp notification,
// and the live socket push all happen from here, regardless of what triggered it
// (threshold breach or the dummy-alert seeder below).
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
  notifyCriticalAlert(alert, meter).catch((err) => console.error("Unexpected error in notifyCriticalAlert:", err));
  notifyCriticalAlertByEmail(alert, meter).catch((err) =>
    console.error("Unexpected error in notifyCriticalAlertByEmail:", err)
  );

  const io = (global as any).io;
  if (io) {
    io.emit("alert:new", { ...alert, meter: { name: input.meterName } });
  }

  return alert;
}

export async function evaluateThresholds(prisma: PrismaClient, meter: Meter, reading: Reading) {
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
    const alert = await createAlert(prisma, {
      meterId: meter.id,
      meterName: meter.name,
      message: breach.message,
      severity: breach.severity,
      value: breach.value,
    });
    createdAlerts.push(alert);
  }

  return createdAlerts;
}