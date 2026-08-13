import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.thresholds || !Array.isArray(body.thresholds)) {
      return NextResponse.json({ error: "thresholds array is required" }, { status: 400 });
    }

    const updates = body.thresholds.map((t: { id: number; maxPowerKw: number }) =>
      prisma.meter.update({
        where: { id: t.id },
        data: { maxPowerKw: t.maxPowerKw },
      })
    );

    const results = await prisma.$transaction(updates);

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    return NextResponse.json({ error: "Failed to update thresholds" }, { status: 500 });
  }
}
