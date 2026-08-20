import { NextRequest, NextResponse } from "next/server";
import { getTransformerTrendsForRange } from "@/lib/dashboard";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const minutesParam = params.get("minutes");
  
  const minutes = Math.min(Number(minutesParam) || 1440, 60 * 24 * 7); // Default to 24h
  const samples = Math.min(Number(params.get("samples") || 96), 200); // 15-min buckets over 24h = 96 samples
  const bucketMinutes = Math.max(1, Math.floor(minutes / samples));
  
  const now = Date.now();
  const fromToday = new Date(now - minutes * 60 * 1000);
  const fromYesterday = new Date(fromToday.getTime() - 24 * 60 * 60 * 1000);
  const toYesterday = new Date(now - 24 * 60 * 60 * 1000);
  
  const [todayTrends, yesterdayTrends] = await Promise.all([
    getTransformerTrendsForRange(fromToday, new Date(now), bucketMinutes),
    getTransformerTrendsForRange(fromYesterday, toYesterday, bucketMinutes),
  ]);

  // Combine them into a frontend-friendly format
  const result: Record<number, { idx: number; time: string; kva: number; yesterdayKva: number }[]> = {};
  
  for (const meterIdStr of Object.keys(todayTrends)) {
    const meterId = Number(meterIdStr);
    const todayPts = todayTrends[meterId] || [];
    const yesterdayPts = yesterdayTrends[meterId] || [];
    
    // We expect them to have the same number of buckets due to math, but let's be safe
    // and match by index.
    result[meterId] = todayPts.slice(-samples).map((pt, i) => {
      // align right side in case length differs
      const yesterdayPt = yesterdayPts[yesterdayPts.length - todayPts.length + i];
      return {
        idx: i,
        time: pt.time,
        kva: pt.kva,
        yesterdayKva: yesterdayPt ? yesterdayPt.kva : 0
      };
    });
  }

  return NextResponse.json(result);
}
