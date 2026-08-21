import { getResendClient } from "./resend-client";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MINUTES = 15;

interface AlertForNotification {
  id: number;
  meterId: number;
  message: string;
  severity: "warning" | "critical";
  value?: number;
  thresholdValue?: number;
  unit?: string;
}

interface MeterForNotification {
  id: number;
  name: string;
}

async function wasRecentlyNotified(meterId: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const recent = await prisma.notificationLog.findFirst({
    where: { meterId, channel: "email", status: "sent", createdAt: { gte: cutoff } },
  });
  return recent !== null;
}

export async function notifyCriticalAlertByEmail(alert: AlertForNotification, meter: MeterForNotification) {
  if (alert.severity !== "critical") return;

  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true") {
    console.log(`Email notification skipped (disabled): would have alerted for meter ${meter.id}`);
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "email", status: "skipped_disabled" },
    });
    return;
  }

  const to = process.env.ADMIN_EMAIL;
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!to) {
    console.warn("Email notification skipped: ADMIN_EMAIL not set");
    return;
  }

  if (await wasRecentlyNotified(alert.meterId)) {
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "email", status: "skipped_cooldown" },
    });
    return;
  }

  const unit = alert.unit ?? "kW";
  const currentValueRow =
    alert.value !== undefined
      ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Current Power</td><td><strong>${alert.value.toFixed(2)} ${unit}</strong></td></tr>`
      : "";
  const thresholdRow =
    alert.thresholdValue !== undefined
      ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Configured Threshold</td><td>${alert.thresholdValue.toFixed(1)} ${unit}</td></tr>`
      : "";

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Critical Alert: ${meter.name}`,
      html: `
        <h2 style="margin:0 0 12px;">🚨 Critical Alert</h2>
        <table style="border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Equipment</td><td><strong>${meter.name}</strong></td></tr>
          ${currentValueRow}
          ${thresholdRow}
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Alert Message</td><td>${alert.message}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td>${new Date().toLocaleString()}</td></tr>
        </table>
      `,
    });

    if (error) throw new Error(error.message);

    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "email", status: "sent" },
    });
  } catch (error) {
    console.error(`Email notification failed for meter ${meter.id}:`, error);
    await prisma.notificationLog.create({
      data: {
        alertId: alert.id,
        meterId: alert.meterId,
        channel: "email",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}