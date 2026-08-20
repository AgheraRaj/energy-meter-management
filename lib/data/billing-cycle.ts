import { generateReport } from "@/lib/reports";

export interface BillingCycleSummary {
  start: string;
  end: string;
  daysElapsed: number;
  daysRemaining: number;
  cycleLengthDays: number;
  consumptionKwh: number;
  cost: number;
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth));
}

// Given a billing anchor date (e.g. the 19th), finds the current cycle window:
// the most recent occurrence of that day-of-month at/before today, through the
// next occurrence — exactly the "19th to 19th" rolling window a utility bill uses.
export async function getBillingCycleSummary(anchorDate: Date | null): Promise<BillingCycleSummary | null> {
  if (!anchorDate) return null;

  const anchorDay = anchorDate.getDate();
  const now = new Date();

  let cycleStart = clampDayToMonth(now.getFullYear(), now.getMonth(), anchorDay);
  if (cycleStart > now) {
    cycleStart = clampDayToMonth(now.getFullYear(), now.getMonth() - 1, anchorDay);
  }

  const cycleEnd = clampDayToMonth(cycleStart.getFullYear(), cycleStart.getMonth() + 1, anchorDay);

  const cycleLengthDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, cycleLengthDays - daysElapsed);

  const report = await generateReport(cycleStart, now < cycleEnd ? now : cycleEnd);

  return {
    start: cycleStart.toISOString(),
    end: cycleEnd.toISOString(),
    daysElapsed,
    daysRemaining,
    cycleLengthDays,
    consumptionKwh: report.totalConsumptionKwh,
    cost: report.totalCost,
  };
}