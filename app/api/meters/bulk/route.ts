import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = [];

    if (body.thresholds && Array.isArray(body.thresholds)) {
      updates.push(
        ...body.thresholds.map((t: { id: number; maxPowerKw: number }) =>
          prisma.meter.update({ where: { id: t.id }, data: { maxPowerKw: t.maxPowerKw } })
        )
      );
    }

    if (body.transformerSetpoints && Array.isArray(body.transformerSetpoints)) {
      updates.push(
        ...body.transformerSetpoints.map(
          (t: { id: number; alarmSetpointKva: number; alertSetpointKva: number }) =>
            prisma.meter.update({
              where: { id: t.id },
              data: { alarmSetpointKva: t.alarmSetpointKva, alertSetpointKva: t.alertSetpointKva },
            })
        )
      );
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "thresholds or transformerSetpoints array is required" }, { status: 400 });
    }

    const results = await prisma.$transaction(updates);
    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    return NextResponse.json({ error: "Failed to update thresholds" }, { status: 500 });
  }
}