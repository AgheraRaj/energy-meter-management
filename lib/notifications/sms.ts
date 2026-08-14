import { getZavuClient } from "./zavu-client";
import { prisma } from "@/lib/prisma";
import type Zavudev from "@zavudev/sdk";

type MessageSendParams = Zavudev.MessageSendParams;

const COOLDOWN_MINUTES = 15;
const MAX_RETRIES = 2;

interface AlertForNotification {
  id: number;
  meterId: number;
  message: string;
  severity: "warning" | "critical" | "normal";
}

interface MeterForNotification {
  id: number;
  name: string;
}

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }).replace(/\s/g, " ");
}

async function wasRecentlyNotified(meterId: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const recent = await prisma.notificationLog.findFirst({
    where: { meterId, channel: "sms", status: "sent", createdAt: { gte: cutoff } },
  });
  return recent !== null;
}

async function sendWithRetry(payload: MessageSendParams) {
  const client = getZavuClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages.send(payload);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

// Same fire-and-forget contract as the other notification channels — never awaited
// by a hot path, all failures caught and logged here. SMS has no template/approval
// requirement the way WhatsApp business-initiated messages do, so this is plain text.
export async function notifyCriticalAlertBySms(alert: AlertForNotification, meter: MeterForNotification) {
  if (alert.severity !== "critical") return;

  if (process.env.SMS_NOTIFICATIONS_ENABLED !== "true") {
    console.log(`SMS notification skipped (disabled): would have alerted for meter ${meter.id}`);
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "sms", status: "skipped_disabled" },
    });
    return;
  }

  const to = process.env.ADMIN_SMS_TO;

  if (!to) {
    console.warn("SMS notification skipped: ADMIN_SMS_TO not set");
    return;
  }

  if (await wasRecentlyNotified(alert.meterId)) {
    await prisma.notificationLog.create({
      data: { alertId: alert.id, meterId: alert.meterId, channel: "sms", status: "skipped_cooldown" },
    });
    return;
  }

  // SMS has a 160-char single-segment limit; keep it short and let it split rather
  // than truncate the actual alert message, which is the part that matters most.
  const text = `CRITICAL ALERT - ${meter.name}: ${alert.message} (${formatTimestamp(new Date())})`;
  const idempotencyKey = `alert-${alert.id}-sms`;

  const payload: MessageSendParams = { to, channel: "sms", text, idempotencyKey };

  try {
    const result = await sendWithRetry(payload);
    await prisma.notificationLog.create({
      data: {
        alertId: alert.id,
        meterId: alert.meterId,
        channel: "sms",
        status: "sent",
        providerMessageId: result?.message?.id ?? null,
      },
    });
  } catch (error) {
    console.error(`SMS notification failed for meter ${meter.id}:`, JSON.stringify(error, null, 2));
    await prisma.notificationLog.create({
      data: {
        alertId: alert.id,
        meterId: alert.meterId,
        channel: "sms",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}