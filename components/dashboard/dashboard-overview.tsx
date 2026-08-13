"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Zap, Gauge as GaugeIcon, BatteryCharging, AlertTriangle } from "lucide-react";
import { DashboardKpi } from "./dashboard-kpi";
import { PowerGauge } from "./power-gauge";
import { PowerOverview } from "./power-overview";
import { MeterDemandCards } from "./meter-demand-cards";
import { EquipmentPowerChart } from "./equipment-power-chart";
import { MeterLoadingChart } from "./meter-loading-chart";
import { RecentEventsLog } from "./recent-events-log";
import { TopConsumers } from "./top-consumers";
import { MeterStatusPanel } from "./meter-status";
import { ActiveAlerts } from "./active-alerts";
import { EnergyDistribution } from "./energy-distribution";
import { LiveReadings } from "./live-readings";
import { EnergyReportsCard } from "./energy-reports-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MeterWithReading, Reading, AlertWithMeter } from "@/lib/types";

interface DashboardOverviewProps {
  initialMeters: MeterWithReading[];
  initialAlerts: AlertWithMeter[];
  ratePerKwh: number;
  last24h: { totalConsumptionKwh: number; totalCost: number };
  todayEnergyKwh: number;
  demandComparison: { todayAvg: number; yesterdayAvg: number };
  monthlyPeaks: Record<number, number>;
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function DashboardOverview({
  initialMeters,
  initialAlerts,
  ratePerKwh,
  todayEnergyKwh,
  demandComparison,
  monthlyPeaks,
}: DashboardOverviewProps) {
  const [meters, setMeters] = useState(initialMeters);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [connected, setConnected] = useState(false);
  const clock = useClock();

  useEffect(() => {
    const socket: Socket = io();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("reading:new", (reading: Reading) => {
      setMeters((prev) => prev.map((m) => (m.id === reading.meterId ? { ...m, latestReading: reading } : m)));
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

    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical").length;
    const warningAlerts = activeAlerts.filter((a) => a.severity === "warning").length;

    const topConsumers = [...meters]
      .filter((m) => m.latestReading)
      .sort((a, b) => (b.latestReading?.powerKw ?? 0) - (a.latestReading?.powerKw ?? 0))
      .slice(0, 5);

    const offlineOrMaintenance = meters.filter((m) => m.status !== "active");
    const thresholdMeters = meters.filter((m) => m.minPowerKw !== null || m.maxPowerKw !== null);

    const configuredCapacity = meters.reduce((sum, m) => sum + (m.maxPowerKw ?? 0), 0);
    const capacityKw = configuredCapacity > 0 ? configuredCapacity : Math.max(currentTotalLoad * 1.5, 10);
    const alarmKw = Number((capacityKw * 0.8).toFixed(1));
    const alertKw = Number((capacityKw * 0.95).toFixed(1));
    const loadingPct = capacityKw > 0 ? (currentTotalLoad / capacityKw) * 100 : 0;

    return {
      total,
      active,
      offline,
      maintenance,
      currentTotalLoad: Number(currentTotalLoad.toFixed(2)),
      activeAlertsCount: activeAlerts.length,
      criticalAlerts,
      warningAlerts,
      topConsumers,
      offlineOrMaintenance,
      thresholdMeters,
      capacityKw,
      alarmKw,
      alertKw,
      loadingPct: Number(loadingPct.toFixed(1)),
    };
  }, [meters, alerts]);

  const plantStatus: "normal" | "alarm" | "alert" =
    stats.currentTotalLoad >= stats.alertKw ? "alert" : stats.currentTotalLoad >= stats.alarmKw ? "alarm" : "normal";

  const statusDot =
    plantStatus === "alert"
      ? "bg-[var(--accent-red)] animate-pulse"
      : plantStatus === "alarm"
        ? "bg-[var(--accent-amber)]"
        : "bg-[var(--accent-green)]";
  const statusLabel = plantStatus === "alert" ? "Alert" : plantStatus === "alarm" ? "Alarm" : "Normal";

  const vsYesterdayPct =
    demandComparison.yesterdayAvg > 0
      ? ((demandComparison.todayAvg - demandComparison.yesterdayAvg) / demandComparison.yesterdayAvg) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-3">
        <div>
          <h2 className="font-display text-lg">EMS Energy Command Center</h2>
          <p className="text-xs text-muted-foreground">{stats.total} monitored meters · live readings</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono-ems">{clock ? clock.toLocaleTimeString() : "--:--:--"}</span>
          <span>
            Total Demand <b className="font-mono-ems text-sm text-foreground">{stats.currentTotalLoad}</b> kW
          </span>
          <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[11px]">
            <span className={cn("h-2 w-2 rounded-full", statusDot)} />
            {statusLabel}
          </span>
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-[var(--accent-green)]" : "bg-muted-foreground"}`} />
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi
          label="Total Plant Demand"
          value={`${stats.currentTotalLoad} kW`}
          icon={Zap}
          sublabel={`${vsYesterdayPct >= 0 ? "▲" : "▼"} ${Math.abs(vsYesterdayPct).toFixed(1)}% vs yesterday`}
          tone={plantStatus === "alert" ? "red" : plantStatus === "alarm" ? "amber" : "default"}
        />
        <DashboardKpi label="Combined Meter Loading" value={`${stats.loadingPct}%`} icon={GaugeIcon} />
        <DashboardKpi label="Energy Consumed Today" value={`${todayEnergyKwh.toLocaleString()} kWh`} icon={BatteryCharging} />
        <DashboardKpi
          label="Active Alarms / Alerts"
          value={String(stats.activeAlertsCount)}
          icon={AlertTriangle}
          href="/alerts"
          tone={stats.criticalAlerts > 0 ? "red" : stats.warningAlerts > 0 ? "amber" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-[13px] text-muted-foreground">Meter Demand — This Month</CardTitle>
          <p className="text-xs text-muted-foreground">Meters with configured thresholds</p>
        </CardHeader>
        <CardContent>
          <MeterDemandCards meters={stats.thresholdMeters} monthlyPeaks={monthlyPeaks} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PowerOverview alarmKw={stats.alarmKw} alertKw={stats.alertKw} />
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-[13px] text-muted-foreground">Demand Gauges</CardTitle>
            <p className="text-xs text-muted-foreground">
              Plant vs setpoints · alarm {stats.alarmKw} kW · alert {stats.alertKw} kW
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-6">
            <PowerGauge label="Plant Demand" value={stats.currentTotalLoad} max={stats.capacityKw} unit="kW" size={170} />
            {stats.thresholdMeters.slice(0, 2).map((meter) => (
              <PowerGauge
                key={meter.id}
                label={meter.name}
                value={meter.latestReading?.powerKw ?? 0}
                max={meter.maxPowerKw ?? 1}
                unit="kW"
                size={150}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <EquipmentPowerChart meters={meters} />
        <MeterLoadingChart meters={meters} />
      </div>

      <RecentEventsLog alerts={alerts.slice(0, 15)} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TopConsumers meters={stats.topConsumers} />
        <MeterStatusPanel
          active={stats.active}
          offline={stats.offline}
          maintenance={stats.maintenance}
          offlineOrMaintenance={stats.offlineOrMaintenance}
        />
      </div>

      <ActiveAlerts alerts={alerts.slice(0, 5)} onAcknowledge={acknowledgeAlert} />
      <EnergyDistribution meters={meters} />
      <LiveReadings meters={meters} />
      <EnergyReportsCard ratePerKwh={ratePerKwh} />
    </div>
  );
}