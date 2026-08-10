"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MeterCard } from "./meter-card";
import { MeterWithReading, Reading } from "@/lib/types";

export function LiveDashboard({ initialMeters }: { initialMeters: MeterWithReading[] }) {
  const [meters, setMeters] = useState(initialMeters);

  useEffect(() => {
    const socket: Socket = io();

    socket.on("reading:new", (reading: Reading) => {
      setMeters((prev) =>
        prev.map((meter) =>
          meter.id === reading.meterId ? { ...meter, latestReading: reading } : meter
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {meters.map((meter) => (
        <MeterCard key={meter.id} meter={meter} />
      ))}
    </div>
  );
}