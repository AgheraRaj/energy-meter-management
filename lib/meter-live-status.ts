// lib/meter-live-status.ts

/** A meter is considered offline if no reading has arrived within this window. */
export const LIVE_STALE_MS = 30_000;

/**
 * True if `recordedAt` is within `thresholdMs` of `now`. `now` is passed in
 * (rather than read internally) so callers can drive it from a ticking
 * clock — e.g. useNow() — and re-evaluate every second even without a new
 * reading event.
 */
export function isReadingLive(
  recordedAt: string | null | undefined,
  now: number,
  thresholdMs: number = LIVE_STALE_MS
): boolean {
  if (!recordedAt) return false;
  return now - new Date(recordedAt).getTime() <= thresholdMs;
}