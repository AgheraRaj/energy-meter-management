"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MeterWithReading, AlertWithMeter, Reading } from "@/lib/types";

interface UseLiveDataOptions {
  initialMeters?: MeterWithReading[];
  initialAlerts?: AlertWithMeter[];
}

export function useLiveData({ initialMeters = [], initialAlerts = [] }: UseLiveDataOptions = {}) {
  const [meters, setMeters] = useState<MeterWithReading[]>(initialMeters);
  const [alerts, setAlerts] = useState<AlertWithMeter[]>(initialAlerts);
  const [connected, setConnected] = useState(false);



  useEffect(() => {
    const socket: Socket = io();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("reading:new", (reading: Reading) => {
      setMeters((prev) =>
        prev.map((m) =>
          m.id === reading.meterId ? { ...m, latestReading: reading } : m
        )
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
