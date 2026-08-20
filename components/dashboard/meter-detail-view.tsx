"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Zap, BatteryCharging, Gauge, Activity } from "lucide-react";
import { DashboardKpi } from "./dashboard-kpi";
import { MeterOverviewHeader } from "./meter-overview-header";
import { MeterTrendCharts } from "./trend-chart";
import { LiveEnergyConsumptionChart } from "./energy-consumption-chart";
import { ElectricalParameters } from "./electrical-parameters";
import { Meter, Reading } from "@/lib/types";

interface MeterDetailViewProps {
  meter: Meter;
  latestReading: Reading | null;
  recentReadings: Reading[];
  consumption: { today: number | null; week: number | null; month: number | null };
  ratePerKwh: number;
}

export function MeterDetailView({
  meter,
  latestReading: initialReading,
  recentReadings: initialRecentReadings,
  consumption,
  ratePerKwh,
}: MeterDetailViewProps) {
  const [latestReading, setLatestReading] = useState(initialReading);
  const [recentReadings, setRecentReadings] = useState(initialRecentReadings);

  useEffect(() => {
    const socket: Socket = io();

    socket.on("reading:new", (reading: Reading) => {
      if (reading.meterId !== meter.id) return; // only react to this meter's readings
      setLatestReading(reading);
      setRecentReadings((prev) => [reading, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, [meter.id]);

  return (
    <div className="space-y-6">
      <MeterOverviewHeader meter={meter} lastCommunication={latestReading?.recordedAt ?? null} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi
          label="Current Power"
          value={latestReading ? `${latestReading.powerKw} kW` : "—"}
          icon={Zap}
        />
        <DashboardKpi
          label="Today's Energy"
          value={consumption.today !== null ? `${consumption.today} kWh` : "No data"}
          icon={BatteryCharging}
          sublabel={consumption.today !== null ? `≈ ₹${(consumption.today * ratePerKwh).toFixed(0)}` : undefined}
        />
        <DashboardKpi
          label="Voltage"
          value={latestReading ? `${latestReading.voltage} V` : "—"}
          icon={Activity}
        />
        <DashboardKpi
          label="Current"
          value={latestReading ? `${latestReading.current} A` : "—"}
          icon={Gauge}
        />
      </div>

      <MeterTrendCharts meterId={meter.id} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LiveEnergyConsumptionChart meterId={meter.id} />
        <ElectricalParameters reading={latestReading} />
      </div>
    </div>
  );
}
