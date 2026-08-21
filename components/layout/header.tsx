"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { MobileSidebar } from "./mobile-sidebar";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";
import { NotificationBell } from "./notification-bell";
import { useLiveData } from "@/hooks/use-live-data";
import { MeterWithReading, AlertWithMeter } from "@/lib/types";

interface HeaderProps {
  initialMeters?: MeterWithReading[];
  initialAlerts?: AlertWithMeter[];
  settings?: { alarmSetpointKw: number; alertSetpointKw: number };
  transformerCount?: number;
  meterCount?: number;
}

const PAGE_TITLES: Record<string, string> = {
  "/":          "Dashboard",
  "/sld":       "Single Line Diagram",
  "/equipment": "Equipment List",
  "/meters":    "Energy Meters",
  "/alerts":    "Alarms & Events",
  "/settings":  "Setpoints & Alerts",
  "/reports":   "Reports",
};

export function Header({
  initialMeters = [],
  initialAlerts = [],
  settings = { alarmSetpointKw: 1400, alertSetpointKw: 1450 },
  transformerCount = 2,
  meterCount = 12,
}: HeaderProps) {
  const pathname = usePathname();
  const { meters, connected } = useLiveData({ initialMeters, initialAlerts });

  const [clock, setClock] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setClock(fmt());
    const t = setInterval(() => setClock(fmt()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalDemand = useMemo(
    () =>
      meters
        .filter((m) => m.status === "active" && m.type === "equipment" && m.latestReading)
        .reduce((sum, m) => sum + (m.latestReading?.powerKw ?? 0), 0),
    [meters]
  );

  const plantStatus: StatusLevel =
    totalDemand >= settings.alertSetpointKw
      ? "alert"
      : totalDemand >= settings.alarmSetpointKw
        ? "alarm"
        : "normal";


  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <MobileSidebar />
        <div className="min-w-0">
          <p className="font-display text-xs font-bold tracking-widest text-muted-foreground truncate">
            VOLTIQ ENERGY COMMAND CENTER
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {transformerCount} incomer transformer{transformerCount !== 1 ? "s" : ""} · {meterCount} monitored load{meterCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Connection dot */}
        <span
          className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[var(--accent-green)]" : "bg-muted-foreground"}`}
          title={connected ? "Live" : "Connecting..."}
        />

        {/* Clock */}
        <span className="hidden font-mono text-sm tabular-nums text-muted-foreground sm:block">{clock}</span>

        {/* Total demand */}
        <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
          Total Demand
          <span className="font-mono font-bold text-foreground tabular-nums">{totalDemand.toFixed(1)}</span>
          kW
        </span>

        {/* Plant status pill */}
        <StatusPill status={plantStatus} size="sm" />

        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}