import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ThresholdInput {
  id: number;
  maxPowerKw?: number;
  ratedKw?: number;
}

interface TransformerSetpointInput {
  id: number;
  // null (both fields blank in the UI) explicitly turns alerting off for
  // that transformer; undefined means "leave whatever's already saved".
  alarmSetpointKva?: number | null;
  alertSetpointKva?: number | null;
  ratedKva?: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = [];

    if (body.thresholds && Array.isArray(body.thresholds)) {
      updates.push(
        ...body.thresholds.map((t: ThresholdInput) => {
          const data: { maxPowerKw?: number; ratedKw?: number } = {};
          if (t.maxPowerKw !== undefined && !Number.isNaN(t.maxPowerKw)) data.maxPowerKw = t.maxPowerKw;
          if (t.ratedKw !== undefined && !Number.isNaN(t.ratedKw)) data.ratedKw = t.ratedKw;
          return prisma.meter.update({ where: { id: t.id }, data });
        })
      );
    }

    if (body.transformerSetpoints && Array.isArray(body.transformerSetpoints)) {
      updates.push(
        ...body.transformerSetpoints.map((t: TransformerSetpointInput) => {
          const data: { alarmSetpointKva?: number | null; alertSetpointKva?: number | null; ratedKw?: number } = {};
          if (t.alarmSetpointKva !== undefined) data.alarmSetpointKva = t.alarmSetpointKva;
          if (t.alertSetpointKva !== undefined) data.alertSetpointKva = t.alertSetpointKva;
          if (t.ratedKva !== undefined && !Number.isNaN(t.ratedKva)) data.ratedKw = t.ratedKva; // ratedKw column doubles as "rated kVA" for transformer rows
          return prisma.meter.update({ where: { id: t.id }, data });
        })
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