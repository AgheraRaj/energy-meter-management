import { NextRequest, NextResponse } from "next/server";
import { getEquipmentChartData, type DashboardFilter } from "@/lib/data/equipment-chart";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const filter: DashboardFilter = request.nextUrl.searchParams.get("filter") === "billing" ? "billing" : "today";
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if (filter === "billing" && !settings.billingCycleAnchorDate) {
    return NextResponse.json(
      { error: "Set a billing date in Settings before viewing billing-period consumption." },
      { status: 422 },
    );
  }

  return NextResponse.json(await getEquipmentChartData(filter, settings.billingCycleAnchorDate));
}
