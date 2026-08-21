"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders the calling component every `intervalMs`, returning a fresh
 * Date.now(). Needed for "meter went offline" states, which must appear
 * even when no new socket event ever arrives (the meter just stops sending).
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}