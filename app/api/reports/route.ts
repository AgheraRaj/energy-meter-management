import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/reports";

function parseDateParam(value: string, endOfDay = false) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (endOfDay) {
      date.setUTCHours(23, 59, 59, 999);
    }
    return date;
  }

  const date = new Date(value);
  if (endOfDay && !Number.isNaN(date.getTime())) {
    // If the caller passed a date-only string without TZ, treat it as the end of the day.
    const normalized = new Date(date.valueOf());
    normalized.setUTCHours(23, 59, 59, 999);
    return normalized;
  }

  return date;
}

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam, true);

  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const report = await generateReport(from, to);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate report" },
      { status: 500 }
    );
  }
}