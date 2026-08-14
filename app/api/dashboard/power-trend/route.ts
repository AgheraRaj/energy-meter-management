import { NextRequest, NextResponse } from "next/server";
import { getPowerTrend, getPowerTrendForRange, PowerTrendRange } from "@/lib/dashboard";

const VALID_RANGES: PowerTrendRange[] = ["24h", "7d", "30d"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rangeParam = params.get("range");
  const minutesParam = params.get("minutes");

  // Allow ?minutes=480&samples=40 as an alternate query mode for the dashboard trend chart
  if (minutesParam) {
    const minutes = Math.min(Number(minutesParam) || 480, 60 * 24 * 7);
    const samples = Math.min(Number(params.get("samples") || 40), 200);
    const bucketMinutes = Math.max(1, Math.floor(minutes / samples));
    const from = new Date(Date.now() - minutes * 60 * 1000);
    const points = await getPowerTrendForRange(from, new Date(), bucketMinutes);
    // Return time as short HH:MM label
    const labelled = points.slice(-samples).map((p) => ({
      time: new Date(p.time).toISOString(),
      totalPowerKw: p.totalPowerKw,
    }));
    return NextResponse.json(labelled);
  }

  const range = VALID_RANGES.includes(rangeParam as PowerTrendRange)
    ? (rangeParam as PowerTrendRange)
    : "24h";

  const points = await getPowerTrend(range);
  return NextResponse.json(points);
}