const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BillingCycle {
  start: Date;
  end: Date; // exclusive — the same day-of-month, one calendar month after `start`
  cycleLengthDays: number;
  daysElapsed: number;
  daysRemaining: number;
}

// Clamps to the last real day of the month for anchors like the 31st
// falling in a 30-day (or February) month — same convention banks and
// utilities use for recurring billing dates.
function nthOfMonth(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, daysInMonth), 0, 0, 0, 0);
}

/**
 * Given an anchor date (only its day-of-month matters, e.g. the 19th) and
 * "now", returns the currently-active billing cycle — exactly like a credit
 * card statement or EMI cycle: the most recent occurrence of that
 * day-of-month at or before `now`, through the same day-of-month one month
 * later. Example: anchor day 19, now = 2026-09-05 → cycle is
 * [2026-08-19, 2026-09-19).
 */
export function getCurrentBillingCycle(anchorDate: Date, now: Date = new Date()): BillingCycle {
  const billingDay = anchorDate.getDate();

  let start = nthOfMonth(now.getFullYear(), now.getMonth(), billingDay);
  if (start > now) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start = nthOfMonth(prevMonth.getFullYear(), prevMonth.getMonth(), billingDay);
  }

  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const end = nthOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), billingDay);

  const cycleLengthDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  const daysElapsed = Math.min(cycleLengthDays, Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const daysRemaining = Math.max(0, cycleLengthDays - daysElapsed);

  return { start, end, cycleLengthDays, daysElapsed, daysRemaining };
}