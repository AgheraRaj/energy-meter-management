import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ratePerKwh: body.ratePerKwh !== undefined ? Number(body.ratePerKwh) : undefined,
      alarmSetpointKw: body.alarmSetpointKw !== undefined ? Number(body.alarmSetpointKw) : undefined,
      alertSetpointKw: body.alertSetpointKw !== undefined ? Number(body.alertSetpointKw) : undefined,
      referenceCapacityKw: body.referenceCapacityKw !== undefined ? Number(body.referenceCapacityKw) : undefined,
      transformerPenaltyRatePerKvah:
        body.transformerPenaltyRatePerKvah !== undefined ? Number(body.transformerPenaltyRatePerKvah) : undefined,
      equipmentPenaltyRatePerKwh:
        body.equipmentPenaltyRatePerKwh !== undefined ? Number(body.equipmentPenaltyRatePerKwh) : undefined,
      billingCycleAnchorDate:
        body.billingCycleAnchorDate !== undefined
          ? body.billingCycleAnchorDate === null
            ? null
            : new Date(body.billingCycleAnchorDate)
          : undefined,
    },
  });
  return NextResponse.json(settings);
}