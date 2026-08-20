import { generateReport } from "@/lib/reports";
import { getCurrentBillingCycle } from "../billing-cycle";

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

  const now = new Date();
  const cycle = getCurrentBillingCycle(anchorDate, now);
  const report = await generateReport(cycle.start, now < cycle.end ? now : cycle.end);

  return {
    start: cycle.start.toISOString(),
    end: cycle.end.toISOString(),
    daysElapsed: cycle.daysElapsed,
    daysRemaining: cycle.daysRemaining,
    cycleLengthDays: cycle.cycleLengthDays,
    consumptionKwh: report.totalConsumptionKwh,
    cost: report.totalCost,
  };
}