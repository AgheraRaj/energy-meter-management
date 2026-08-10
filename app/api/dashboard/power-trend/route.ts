import { NextRequest, NextResponse } from "next/server";
import { getPowerTrend, PowerTrendRange } from "@/lib/dashboard";

const VALID_RANGES: PowerTrendRange[] = ["24h", "7d", "30d"];

export async function GET(request: NextRequest) {
  const rangeParam = request.nextUrl.searchParams.get("range") ?? "24h";
  const range = VALID_RANGES.includes(rangeParam as PowerTrendRange)
    ? (rangeParam as PowerTrendRange)
    : "24h";

  const points = await getPowerTrend(range);
  return NextResponse.json(points);
}