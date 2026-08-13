import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ratePerKwh: 8.5,
      alarmSetpointKw: 1400.0,
      alertSetpointKw: 1450.0,
      referenceCapacityKw: 1500.0,
    },
  });
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
    },
  });
  return NextResponse.json(settings);
}