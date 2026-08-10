"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Gauge, Zap, BatteryCharging, IndianRupee, AlertTriangle, HeartPulse } from "lucide-react";
import { DashboardKpi } from "./dashboard-kpi";
import { PowerOverview } from "./power-overview";
import { TopConsumers } from "./top-consumers";
import { MeterStatusPanel } from "./meter-status";
import { ActiveAlerts } from "./active-alerts";
import { ThresholdMonitor } from "./threshold-monitor";
import { EnergyDistribution } from "./energy-distribution";
import { LiveReadings } from "./live-readings";
import { EnergyReportsCard } from "./energy-reports-card";
import { MeterWithReading, Reading, AlertWithMeter } from "@/lib/types";

interface DashboardOverviewProps {
  initialMeters: MeterWithReading[];
  initialAlerts: AlertWithMeter[];
  ratePerKwh: number;
  last24h: { totalConsumptionKwh: number; totalCost: number };
}

export function DashboardOverview({ initialMeters, initialAlerts, ratePerKwh, last24h }: DashboardOverviewProps) {
  const [meters, setMeters] = useState(initialMeters);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Single socket connection for the whole dashboard — every section below derives
  // from this same `meters`/`alerts` state instead of opening its own subscription.
  useEffect(() => {
    const socket: Socket = io();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("reading:new", (reading: Reading) => {
      setMeters((prev) =>
        prev.map((meter) => (meter.id === reading.meterId ? { ...meter, latestReading: reading } : meter))
      );
      setLastUpdated(new Date());
    });

    socket.on("alert:new", (alert: AlertWithMeter) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function acknowledgeAlert(id: number) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
  }

  const stats = useMemo(() => {
    const total = meters.length;
    const active = meters.filter((m) => m.status === "active").length;
    const offline = meters.filter((m) => m.status === "offline").length;
    const maintenance = meters.filter((m) => m.status === "maintenance").length;

    const currentTotalLoad = meters
      .filter((m) => m.status === "active" && m.latestReading)
      .reduce((sum, m) => sum + (m.latestReading?.powerKw ?? 0), 0);

    const totalEnergy = meters.reduce((sum, m) => sum + (m.latestReading?.energyKwh ?? 0), 0);

    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical").length;
    const warningAlerts = activeAlerts.filter((a) => a.severity === "warning").length;

    const topConsumers = [...meters]
      .filter((m) => m.latestReading)
      .sort((a, b) => (b.latestReading?.powerKw ?? 0) - (a.latestReading?.powerKw ?? 0))
      .slice(0, 5);

    const offlineOrMaintenance = meters.filter((m) => m.status !== "active");
    const thresholdMeters = meters.filter((m) => m.minPowerKw !== null || m.maxPowerKw !== null);

    return {
      total,
      active,
      offline,
      maintenance,
      currentTotalLoad: Number(currentTotalLoad.toFixed(2)),
      totalEnergy: Number(totalEnergy.toFixed(1)),
      activeAlertsCount: activeAlerts.length,
      criticalAlerts,
      warningAlerts,
      topConsumers,
      offlineOrMaintenance,
      thresholdMeters,
    };
  }, [meters, alerts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">EMS Dashboard</h2>
          <p className="text-sm text-muted-foreground">Energy Management Overview</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
            {connected ? "Live" : "Connecting..."}
          </span>
          {lastUpdated && (
            <span>
              Updated{" "}
              {lastUpdated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardKpi
          label="Total Meters"
          value={String(stats.total)}
          icon={Gauge}
          breakdown={[
            { label: "Active", value: String(stats.active), className: "text-emerald-400" },
            { label: "Offline", value: String(stats.offline), className: "text-red-400" },
            { label: "Maint.", value: String(stats.maintenance), className: "text-amber-400" },
          ]}
        />
        <DashboardKpi label="Current Load" value={`${stats.currentTotalLoad} kW`} icon={Zap} sublabel="Sum of active meters" />
        <DashboardKpi
          label="Total Energy"
          value={`${stats.totalEnergy.toLocaleString()} kWh`}
          icon={BatteryCharging}
          sublabel="Latest recorded energy"
        />
        <DashboardKpi
          label="Energy Cost"
          value={`₹${last24h.totalCost.toLocaleString()}`}
          icon={IndianRupee}
          sublabel={`Last 24h (est.) · ₹${ratePerKwh}/kWh`}
        />
        <DashboardKpi
          label="Active Alerts"
          value={String(stats.activeAlertsCount)}
          icon={AlertTriangle}
          href="/alerts"
          accentClassName={stats.criticalAlerts > 0 ? "text-red-400" : undefined}
          breakdown={[
            { label: "Critical", value: String(stats.criticalAlerts), className: "text-red-400" },
            { label: "Warning", value: String(stats.warningAlerts), className: "text-amber-400" },
          ]}
        />
        <DashboardKpi label="Meter Health" value={`${stats.active} / ${stats.total}`} icon={HeartPulse} sublabel="Online" />
      </div>

      <PowerOverview />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TopConsumers meters={stats.topConsumers} />
        <MeterStatusPanel
          active={stats.active}
          offline={stats.offline}
          maintenance={stats.maintenance}
          offlineOrMaintenance={stats.offlineOrMaintenance}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ActiveAlerts alerts={alerts.slice(0, 5)} onAcknowledge={acknowledgeAlert} />
        <ThresholdMonitor meters={stats.thresholdMeters} />
      </div>

      <EnergyDistribution meters={meters} />
      <LiveReadings meters={meters} />
      <EnergyReportsCard ratePerKwh={ratePerKwh} />
    </div>
  );
}