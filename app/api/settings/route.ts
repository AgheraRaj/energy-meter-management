import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ratePerKwh: 8.5 },
  });
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: { ratePerKwh: body.ratePerKwh },
  });
  return NextResponse.json(settings);
}