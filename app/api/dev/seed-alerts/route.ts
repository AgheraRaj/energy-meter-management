import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAlert } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dummy alert seeding is disabled in production" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const severity: "warning" | "critical" = body.severity === "warning" ? "warning" : "critical";
  const count = Math.min(Number(body.count) || 1, 10);

  const meters = await prisma.meter.findMany({ take: 5 });
  if (meters.length === 0) {
    return NextResponse.json({ error: "No meters found to attach dummy alerts to" }, { status: 400 });
  }

  const created = [];
  for (let i = 0; i < count; i++) {
    const meter = meters[i % meters.length];
    const value = Number((Math.random() * 10 + 1).toFixed(2));
    const message =
      severity === "critical"
        ? `Power ${value} kW exceeded max threshold (test alert)`
        : `Power ${value} kW dropped below min threshold (test alert)`;

    const alert = await createAlert(prisma, {
      meterId: meter.id,
      meterName: meter.name,
      message,
      severity,
      value,
    });
    created.push(alert);
  }

  return NextResponse.json({ created: created.length, alerts: created }, { status: 201 });
}