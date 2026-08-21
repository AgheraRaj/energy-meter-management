"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MeterWithReading, AlertWithMeter, Reading } from "@/lib/types";

interface UseLiveDataOptions {
  initialMeters?: MeterWithReading[];
  initialAlerts?: AlertWithMeter[];
  /** Reset local state when this changes (e.g. Today <-> Billing Date). */
  filter?: string;
}

export function useLiveData({ initialMeters = [], initialAlerts = [], filter }: UseLiveDataOptions = {}) {
  const [meters, setMeters] = useState<MeterWithReading[]>(initialMeters);
  const [alerts, setAlerts] = useState<AlertWithMeter[]>(initialAlerts);
  const [connected, setConnected] = useState(false);

  // Re-seed from the server only when the selected period actually changes
  // (e.g. the user switches Today <-> Billing Date). We deliberately key
  // this off `filter` — a primitive — rather than the initialMeters/
  // initialAlerts array references: Server Components hand down a brand
  // new array instance on every render even when the underlying data is
  // identical, so depending on those references re-fires this effect,
  // calls setState, triggers a re-render, and loops forever.
  useEffect(() => {
    setMeters(initialMeters);
    setAlerts(initialAlerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const socket: Socket = io();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("reading:new", (reading: Reading) => {
      setMeters((prev) =>
        prev.map((m) => {
          if (m.id !== reading.meterId) return m;
          const current = m.latestReading;
          if (current) {
            // Prefer the row id — it's monotonically increasing and
            // immune to duplicate/same-second recordedAt values (common
            // with fast simulator ticks or test payloads that reuse a
            // fixed timestamp). Fall back to recordedAt only when either
            // side is missing an id. Reject strictly-older data only —
            // never block a genuinely new row, and never let a
            // backfilled/historical reading regress the live value.
            if (current.id != null && reading.id != null) {
              if (reading.id <= current.id) return m;
            } else if (new Date(reading.recordedAt).getTime() < new Date(current.recordedAt).getTime()) {
              return m;
            }
          }
          return { ...m, latestReading: reading };
        })
      );
    });

    socket.on("alert:new", (alert: AlertWithMeter) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 99)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { meters, setMeters, alerts, setAlerts, connected };
}