import { PrismaClient, Reading, Meter } from "./generated/prisma/client";
import { notifyCriticalAlertByEmail } from "./notifications/email";
import { notifyCriticalAlert } from "./notifications/whatsapp";

interface CreateAlertInput {
  meterId: number;
  meterName: string;
  message: string;
  severity: "warning" | "critical" | "normal";
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
  if (alert.severity !== "normal") {
    const alertForNotif = alert as any;
    notifyCriticalAlert(alertForNotif, meter).catch((err) => console.error("Unexpected error in notifyCriticalAlert:", err));
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

export async function evaluateThresholds(prisma: PrismaClient, meter: Meter, reading: Reading) {
  const breaches: { message: string; severity: "warning" | "critical" | "normal"; value: number }[] = [];

  // 1. Per-meter specific threshold checks
  if (meter.maxPowerKw !== null) {
    if (reading.powerKw > meter.maxPowerKw) {
      breaches.push({
        message: `Power ${reading.powerKw} kW exceeded max threshold of ${meter.maxPowerKw} kW`,
        severity: reading.powerKw > meter.maxPowerKw * 1.2 ? "critical" : "warning",
        value: reading.powerKw,
      });
    } else {
      // Check if there is an active (unacknowledged) alert for this specific meter
      const activeAlert = await prisma.alert.findFirst({
        where: {
          meterId: meter.id,
          acknowledged: false,
          message: { contains: "exceeded max threshold" },
        },
      });
      if (activeAlert) {
        // Auto-acknowledge/clear the warning/critical alert
        await prisma.alert.update({
          where: { id: activeAlert.id },
          data: { acknowledged: true },
        });

        // Add a "normal" cleared alert log in the database
        breaches.push({
          message: `${meter.name} (${meter.feederCode || ""}) back to normal (${reading.powerKw.toFixed(1)} kW)`,
          severity: "normal",
          value: reading.powerKw,
        });
      }
    }
  }

  if (meter.minPowerKw !== null && reading.powerKw < meter.minPowerKw) {
    breaches.push({
      message: `Power ${reading.powerKw} kW dropped below min threshold of ${meter.minPowerKw} kW`,
      severity: "warning",
      value: reading.powerKw,
    });
  }

  // 2. Plant-level demand setpoint checks
  if (meter.type === "equipment") {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings) {
      // Query latest readings of all active equipment meters
      const equipmentMeters = await prisma.meter.findMany({
        where: { type: "equipment", status: "active" },
        include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
      });

      const totalEquipmentPower = equipmentMeters.reduce((sum, m) => {
        if (m.id === meter.id) {
          return sum + reading.powerKw;
        }
        return sum + (m.readings[0]?.powerKw ?? 0);
      }, 0);

      if (totalEquipmentPower > settings.alertSetpointKw) {
        const activeAlert = await prisma.alert.findFirst({
          where: {
            acknowledged: false,
            message: { startsWith: "Total plant demand exceeded alert setpoint" },
          },
        });
        if (!activeAlert) {
          breaches.push({
            message: `Total plant demand ${totalEquipmentPower.toFixed(1)} kW exceeded alert setpoint of ${settings.alertSetpointKw} kW`,
            severity: "critical",
            value: totalEquipmentPower,
          });
        }
      } else if (totalEquipmentPower > settings.alarmSetpointKw) {
        const activeAlarm = await prisma.alert.findFirst({
          where: {
            acknowledged: false,
            message: { startsWith: "Total plant demand exceeded alarm setpoint" },
          },
        });
        if (!activeAlarm) {
          breaches.push({
            message: `Total plant demand ${totalEquipmentPower.toFixed(1)} kW exceeded alarm setpoint of ${settings.alarmSetpointKw} kW`,
            severity: "warning",
            value: totalEquipmentPower,
          });
        }
      } else {
        // Under both setpoints. Check if there are any active plant-level alerts
        const activePlantAlert = await prisma.alert.findFirst({
          where: {
            acknowledged: false,
            message: { startsWith: "Total plant demand exceeded" },
          },
        });
        if (activePlantAlert) {
          await prisma.alert.update({
            where: { id: activePlantAlert.id },
            data: { acknowledged: true },
          });

          breaches.push({
            message: `Total plant demand back to normal (${totalEquipmentPower.toFixed(1)} kW)`,
            severity: "normal",
            value: totalEquipmentPower,
          });
        }
      }
    }
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