import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/reports";

function parseDateParam(value: string, endOfDay = false) {
  // Date-only string (legacy/simple case) — apply day boundaries explicitly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (endOfDay) date.setUTCHours(23, 59, 59, 999);
    return date;
  }
  // Full datetime (datetime-local input, or explicit ISO string) — use as-is.
  return new Date(value);
}

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam, true);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "from/to must be valid dates" }, { status: 400 });
  }
  if (from >= to) {
    return NextResponse.json({ error: "'From' must be earlier than 'To'" }, { status: 400 });
  }
  if (to > new Date()) {
    return NextResponse.json({ error: "'To' cannot be in the future" }, { status: 400 });
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