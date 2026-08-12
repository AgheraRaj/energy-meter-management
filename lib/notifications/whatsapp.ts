import { getZavuClient } from "./zavu-client";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MINUTES = 15;
const MAX_RETRIES = 2;

interface AlertForNotification {
  id: number;
  meterId: number;
  message: string;
  severity: "warning" | "critical";
}

interface MeterForNotification {
  id: number;
  name: string;
}

async function wasRecentlyNotified(meterId: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const recent = await prisma.notificationLog.findFirst({
    where: { meterId, channel: "whatsapp", status: "sent", createdAt: { gte: cutoff } },
  });
  return recent !== null;
}

async function sendWithRetry(payload: Record<string, unknown>) {
  const client = getZavuClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.messages.send(payload as any);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000)); // simple backoff
      }
    }
  }
  throw lastError;
}

// Fire-and-forget by design — callers must not `await` this on a hot path
// (reading ingestion, API responses). All failures are caught and logged here,
// never thrown back to the caller.
export async function notifyCriticalAlert(alert: AlertForNotification, meter: MeterForNotification) {
  if (alert.severity !== "critical") return;

  // Kill switch: keeps API calls off by default. Only flip
  // WHATSAPP_NOTIFICATIONS_ENABLED=true in .env when deliberately testing delivery.
  if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== "true") {
    console.log(`WhatsApp notification skipped (disabled): would have alerted for meter ${meter.id}`);
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "whatsapp", status: "skipped_disabled" },
    });
    return;
  }

  const to = process.env.ADMIN_WHATSAPP_TO?.replace(/^whatsapp:/, "");
  const templateId = process.env.ZAVU_WHATSAPP_TEMPLATE_ID;

  if (!to) {
    console.warn("WhatsApp notification skipped: ADMIN_WHATSAPP_TO not set");
    return;
  }

  if (await wasRecentlyNotified(alert.meterId)) {
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "whatsapp", status: "skipped_cooldown" },
    });
    return;
  }

  // Alerts are always business-initiated (not a reply to something the admin sent),
  // so WhatsApp/Meta require an approved template outside the 24h customer-initiated
  // window — this is a WhatsApp platform rule Zavu enforces the same as any provider.
  // Free-text `text` only works if the admin messaged this number within the last 24h.
  const payload = templateId
    ? {
        to,
        channel: "whatsapp",
        messageType: "template",
        content: {
          templateId,
          templateVariables: {
            "1": meter.name,
            "2": alert.message,
            "3": new Date().toLocaleString(),
          },
        },
      }
    : {
        to,
        channel: "whatsapp",
        text: `🚨 CRITICAL ALERT\nMeter: ${meter.name}\n${alert.message}\nTime: ${new Date().toLocaleString()}`,
      };

  try {
    await sendWithRetry(payload);
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "whatsapp", status: "sent" },
    });
  } catch (error) {
  console.error(`WhatsApp notification failed for meter ${meter.id}:`, JSON.stringify(error, null, 2));
  await prisma.notificationLog.create({
    data: {
      alertId: alert.id,
      meterId: alert.meterId,
      channel: "whatsapp",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    },
  });
}
}