"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MeterWithReading, AlertWithMeter, Reading } from "@/lib/types";

interface UseLiveDataOptions {
  initialMeters?: MeterWithReading[];
  initialAlerts?: AlertWithMeter[];
  filter?: string;
}

export function useLiveData({ initialMeters = [], initialAlerts = [], filter }: UseLiveDataOptions = {}) {
  const [meters, setMeters] = useState<MeterWithReading[]>(initialMeters);
  const [alerts, setAlerts] = useState<AlertWithMeter[]>(initialAlerts);
  const [connected, setConnected] = useState(false);

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
      // Guard against a duplicate delivery (e.g. a reconnect racing a fetch)
      // incrementing the notification count twice for the same alert.
      setAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev.slice(0, 99)]));
    });

    socket.on("alert:acknowledged", ({ id }: { id: number }) => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { meters, setMeters, alerts, setAlerts, connected };
}