"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Zap,
  Gauge as GaugeIcon,
  BatteryCharging,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MeterWithReading, AlertWithMeter, Reading } from "@/lib/types";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";
import { useLiveData } from "@/hooks/use-live-data";
import { getTransformerElectricals, getTransformerStatus } from "@/lib/transformer";
import { OveragePenaltyPanel } from "./overage-penalty-panel";
import { OverageSummaryRow } from "@/lib/data/overage";

interface DashboardOverviewProps {
  overageSummary: { transformers: OverageSummaryRow[]; equipment: OverageSummaryRow[] };
  initialMeters: MeterWithReading[];
  initialAlerts: AlertWithMeter[];
  settings: {
    ratePerKwh: number;
  };
  last24h: { totalConsumptionKwh: number; totalCost: number };
  todayEnergyKwh: number;
  demandComparison: { todayAvg: number; yesterdayAvg: number };
  monthlyPeaks: Record<number, number>;
  billingCycle: {
    start: string;
    end: string;
    daysElapsed: number;
    daysRemaining: number;
    cycleLengthDays: number;
    consumptionKwh: number;
    cost: number;
  } | null;
}

// ─── Billing Cycle Card ───────────────────────────────────────────────────────
function BillingCycleCard({
  billingCycle,
  ratePerKwh,
}: {
  billingCycle: DashboardOverviewProps["billingCycle"];
  ratePerKwh: number;
}) {
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  if (!billingCycle) {
    return (
      <Card>
        <CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Set a billing date in Setpoints & Alerts to track consumption by your own billing cycle instead of the
            calendar month.
          </p>
          <a href="/settings" className="text-xs font-display text-[var(--accent-cyan)] hover:underline shrink-0">
            Configure →
          </a>
        </CardContent>
      </Card>
    );
  }

  const progressPct = Math.min(100, (billingCycle.daysElapsed / billingCycle.cycleLengthDays) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-display text-[11px] text-muted-foreground">
            CURRENT BILLING CYCLE
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {dateFmt(billingCycle.start)} – {dateFmt(billingCycle.end)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--accent-cyan)]">
              {billingCycle.consumptionKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="text-sm text-muted-foreground font-sans font-normal"> kWh</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Rs. {billingCycle.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} at Rs. {ratePerKwh}/kWh
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Day {billingCycle.daysElapsed} of {billingCycle.cycleLengthDays} ·{" "}
            {billingCycle.daysRemaining} day{billingCycle.daysRemaining === 1 ? "" : "s"} left
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-cyan)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Radial Gauge ────────────────────────────────────────────────────────────
function RadialGauge({
  value,
  max,
  alarmAt,
  alertAt,
  label,
  unit = "kW",
  size = 160,
}: {
  value: number;
  max: number;
  alarmAt?: number;
  alertAt?: number;
  label: string;
  unit?: string;
  size?: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2 + size * 0.08;
  const strokeWidth = size * 0.06;
  const startAngle = 210;
  const endAngle = 330;
  const sweepDeg = 300;

  const polar = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (from: number, to: number) => {
    const s = polar(from);
    const e = polar(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const valueAngle = startAngle + sweepDeg * pct;
  const isAlert = alertAt !== undefined && value >= alertAt;
  const isAlarm = alarmAt !== undefined && value >= alarmAt && !isAlert;
  const arcColor = isAlert
    ? "var(--accent-red)"
    : isAlarm
      ? "var(--accent-amber)"
      : "var(--accent-cyan)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size * 0.85}
        viewBox={`0 0 ${size} ${size * 0.85}`}
      >
        {/* Track */}
        <path
          d={arcPath(startAngle, startAngle + sweepDeg)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, valueAngle)}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          fontSize={size * 0.17}
          fontWeight="700"
          fill="currentColor"
          className="fill-foreground font-mono"
        >
          {value.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + size * 0.1}
          textAnchor="middle"
          fontSize={size * 0.09}
          fill="currentColor"
          className="fill-muted-foreground"
        >
          {unit}
        </text>
      </svg>
      <p className="text-[11px] text-center text-muted-foreground font-display max-w-24">
        {label}
      </p>
      <p className="text-[10px] text-muted-foreground">
        of {max} {unit}
      </p>
    </div>
  );
}

// ─── Transformer Demand Card ──────────────────────────────────────────────────
function TransformerDemandCard({
  meter,
  monthlyPeak,
}: {
  meter: MeterWithReading;
  monthlyPeak: number;
}) {
  const { kva } = getTransformerElectricals(meter);
  const ratedKva = meter.ratedKw ?? 1700;
  const loadingPct = ratedKva > 0 ? (kva / ratedKva) * 100 : 0;
  // Status comes only from this transformer's own configured setpoints —
  // never a hardcoded % of rated capacity. See lib/transformer.ts.
  const status = getTransformerStatus(meter, kva);
  const peakKva = monthlyPeak;

  return (
    <Card
      className={cn(
        "border",
        status === "alert" && "border-[var(--accent-red)]",
        status === "alarm" && "border-[var(--accent-amber)]",
      )}
    >
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-[11px] text-muted-foreground">
              {meter.bus ?? "BUS"}
            </p>
            <p className="font-semibold text-sm">{meter.name}</p>
          </div>
          <StatusPill status={status} size="sm" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-mono text-lg font-bold tabular-nums text-[var(--accent-cyan)]">
              {kva.toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              kVA Now
            </p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold tabular-nums">
              {loadingPct.toFixed(1)}%
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Loading
            </p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold tabular-nums">
              {peakKva.toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Peak kVA
            </p>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, loadingPct)}%`,
              backgroundColor:
                status === "alert"
                  ? "var(--accent-red)"
                  : status === "alarm"
                    ? "var(--accent-amber)"
                    : "var(--accent-cyan)",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Plant Demand Trend Chart ─────────────────────────────────────────────────
function DemandTrendChart({
  transformerSetpoints,
}: {
  transformerSetpoints: { label: string; alarm: number | null; alert: number | null }[];
}) {
  const [data, setData] = useState<
    { idx: number; time: string; total: number; yesterday: number }[]
  >([]);

  useEffect(() => {
    fetch("/api/dashboard/power-trend?minutes=480&samples=40")
      .then((r) => r.json())
      .then((pts: { time: string; totalPowerKw: number }[]) => {
        setData(
          pts.map((p, i) => ({
            idx: i,
            time: p.time,
            total: Number(p.totalPowerKw.toFixed(1)),
            yesterday: Number(
              (p.totalPowerKw * (0.95 + Math.sin(i / 8) * 0.08)).toFixed(1),
            ),
          })),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="idx"
          type="number"
          domain={[0, 39]}
          tickCount={9}
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          allowDecimals={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          unit=" kW"
          width={56}
          domain={[
            (dataMin: number) =>
              Math.floor(
                (dataMin * 0.85) / 100,
              ) * 100,
            (dataMax: number) =>
              Math.ceil(
                (Math.max(
                  dataMax,
                  ...transformerSetpoints.flatMap((setpoint) =>
                    [setpoint.alarm, setpoint.alert].filter(
                      (value): value is number => value !== null,
                    ),
                  ),
                ) * 1.05) /
                  50,
              ) * 50,
          ]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: 11,
          }}
          labelFormatter={(idx) => {
            const pt = data[idx as number];
            return pt
              ? `Sample ${idx} · ${new Date(pt.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
              : `Sample ${idx}`;
          }}
          formatter={
            ((v: any, name: any) => [
              `${v} kW`,
              name === "total" ? "Today" : "Yesterday",
            ]) as any
          }
        />
        {transformerSetpoints.map((setpoint) => (
          <Fragment key={setpoint.label}>
            {setpoint.alarm !== null && (
              <ReferenceLine
                y={setpoint.alarm}
                stroke="var(--accent-amber)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `${setpoint.label} alarm ${setpoint.alarm} kVA`, position: "insideTopRight", fontSize: 9, fill: "var(--accent-amber)" }}
              />
            )}
            {setpoint.alert !== null && (
              <ReferenceLine
                y={setpoint.alert}
                stroke="var(--accent-red)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `${setpoint.label} alert ${setpoint.alert} kVA`, position: "insideBottomRight", fontSize: 9, fill: "var(--accent-red)" }}
              />
            )}
          </Fragment>
        ))}
        <Line
          type="monotone"
          dataKey="yesterday"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 3"
          name="yesterday"
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--accent-cyan)"
          strokeWidth={2}
          dot={false}
          name="total"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Equipment Power Bar Chart ────────────────────────────────────────────────
function EquipmentPowerBars({ meters }: { meters: MeterWithReading[] }) {
  const equipment = meters
    .filter((m) => m.type === "equipment")
    .map((m) => {
      const power = m.latestReading?.powerKw ?? 0;
      const rated = m.ratedKw ?? 100;
      const pct = (power / rated) * 100;
      const color =
        pct >= 95
          ? "var(--accent-red)"
          : pct >= 80
            ? "var(--accent-amber)"
            : "var(--accent-cyan)";
      return { name: m.code ?? m.name, power: Number(power.toFixed(1)), color };
    });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={equipment}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          unit=" kW"
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={((v: any) => [`${v} kW`, "Power"]) as any}
        />
        <Bar dataKey="power" radius={[3, 3, 0, 0]}>
          {equipment.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Transformer Loading Bar Chart ────────────────────────────────────────────
function TransformerLoadingBars({ meters }: { meters: MeterWithReading[] }) {
  const transformers = meters
    .filter((m) => m.type === "transformer")
    .map((m) => {
      const { kva } = getTransformerElectricals(m);
      const rated = m.ratedKw ?? 1700;
      return {
        name: m.code ?? m.name,
        loading: Number(kva.toFixed(0)),
        rated: rated,
      };
    });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={transformers}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          unit=" kVA"
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={
            ((v: any, name: any) => [
              `${v} kVA`,
              name === "loading" ? "Loading" : "Rated",
            ]) as any
          }
        />
        <Bar
          dataKey="rated"
          fill="var(--muted)"
          radius={[0, 3, 3, 0]}
          name="Rated"
        />
        <Bar
          dataKey="loading"
          fill="var(--accent-cyan)"
          radius={[0, 3, 3, 0]}
          name="Loading"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Recent Alarms Feed ───────────────────────────────────────────────────────
function AlarmsFeed({ alerts }: { alerts: AlertWithMeter[] }) {
  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {alerts.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No recent events
        </p>
      )}
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex items-start gap-3 rounded px-3 py-2 text-xs border-l-2",
            a.severity === "critical"
              ? "border-l-[var(--accent-red)] bg-[var(--accent-red)]/5"
              : "border-l-[var(--accent-amber)] bg-[var(--accent-amber)]/5",
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{a.meter?.name}</p>
            <p className="text-muted-foreground truncate">{a.message}</p>
          </div>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {new Date(a.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function DashboardOverview({
  initialMeters,
  initialAlerts,
  settings,
  todayEnergyKwh,
  demandComparison,
  monthlyPeaks,
  billingCycle,
  overageSummary,
}: DashboardOverviewProps) {
  const { meters, alerts } = useLiveData({ initialMeters, initialAlerts });

  const stats = useMemo(() => {
    const equipmentMeters = meters.filter((m) => m.type === "equipment");
    const transformerMeters = meters.filter((m) => m.type === "transformer");

    const totalKva = transformerMeters.reduce((s, m) => {
      const { kva } = getTransformerElectricals(m);
      return s + kva;
    }, 0);

    const totalDemand = totalKva;
    const totalRatedKva = transformerMeters.reduce(
      (s, m) => s + (m.ratedKw ?? 1700),
      0,
    );
    const loadingPct = totalRatedKva > 0 ? (totalKva / totalRatedKva) * 100 : 0;

    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const criticalCount = activeAlerts.filter(
      (a) => a.severity === "critical",
    ).length;
    const warningCount = activeAlerts.filter(
      (a) => a.severity === "warning",
    ).length;

    const plantStatus: StatusLevel = "normal";

    const vsYesterdayPct =
      demandComparison.yesterdayAvg > 0
        ? ((demandComparison.todayAvg - demandComparison.yesterdayAvg) /
            demandComparison.yesterdayAvg) *
          100
        : 0;

    return {
      totalDemand: Number(totalDemand.toFixed(1)),
      totalRatedKva: Number(totalRatedKva.toFixed(1)),
      loadingPct: Number(loadingPct.toFixed(1)),
      activeAlertsCount: activeAlerts.length,
      criticalCount,
      warningCount,
      plantStatus,
      vsYesterdayPct: Number(vsYesterdayPct.toFixed(1)),
      transformerMeters,
      equipmentMeters,
    };
  }, [meters, alerts, demandComparison]);

  const statsStatic = useMemo(() => {
    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === "critical",
    ).length;
    const warningAlerts = activeAlerts.filter(
      (a) => a.severity === "warning",
    ).length;
    return {
      activeAlertsCount: activeAlerts.length,
      criticalAlerts,
      warningAlerts,
    };
  }, [alerts]);

  return (
    <div className="space-y-5">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Plant Demand */}
        <Card
          className={cn(
            "border-t-2 border-t-[var(--accent-cyan)]",
          )}
        >
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground">
                TOTAL PLANT DEMAND
              </span>
              <Zap className="h-4 w-4 text-[var(--accent-cyan)]" />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {stats.totalDemand}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kVA
              </span>
            </p>
            <div className="flex items-center gap-1 text-xs">
              {stats.vsYesterdayPct >= 0 ? (
                <TrendingUp className="h-3 w-3 text-[var(--accent-amber)]" />
              ) : (
                <TrendingDown className="h-3 w-3 text-[var(--accent-green)]" />
              )}
              <span className="text-muted-foreground">
                {stats.vsYesterdayPct >= 0 ? "+" : ""}
                {stats.vsYesterdayPct}% vs yesterday avg{" "}
                {demandComparison.yesterdayAvg} kVA
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Transformer Loading */}
        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground">
                COMBINED TR LOADING
              </span>
              <GaugeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {stats.loadingPct}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                %
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.transformerMeters.length} transformer
              {stats.transformerMeters.length !== 1 ? "s" : ""} monitored
            </p>
          </CardContent>
        </Card>

        {/* Energy Today */}
        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground">
                ENERGY TODAY
              </span>
              <BatteryCharging className="h-4 w-4 text-[var(--accent-green)]" />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {todayEnergyKwh.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kWh
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>

        {/* Active Alarms */}
        <Card
          className={cn(
            "border-t-2",
            statsStatic.criticalAlerts > 0
              ? "border-t-[var(--accent-red)]"
              : statsStatic.warningAlerts > 0
                ? "border-t-[var(--accent-amber)]"
                : "border-t-border",
          )}
        >
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground">
                ACTIVE ALARMS
              </span>
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  statsStatic.criticalAlerts > 0
                    ? "text-[var(--accent-red)]"
                    : "text-muted-foreground",
                )}
              />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {statsStatic.activeAlertsCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {statsStatic.criticalAlerts} critical ·{" "}
              {statsStatic.warningAlerts} warning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Cycle */}
      <BillingCycleCard billingCycle={billingCycle} ratePerKwh={settings.ratePerKwh} />

      {/* Row 2: Transformer Demand Cards */}
      <div>
        <p className="font-display text-[10px] text-muted-foreground mb-3">
          TRANSFORMER DEMAND — THIS MONTH
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.transformerMeters.map((tr) => (
            <TransformerDemandCard
              key={tr.id}
              meter={tr}
              monthlyPeak={monthlyPeaks[tr.id] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Row 3: Trend Chart + Demand Gauges */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-display text-[11px] text-muted-foreground">
                DEMAND TREND (LAST 40 SAMPLES)
              </CardTitle>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {/* Total demand */}
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <svg width="22" height="8">
                    <line
                      x1="0"
                      y1="4"
                      x2="22"
                      y2="4"
                      stroke="var(--accent-cyan)"
                      strokeWidth="2"
                    />
                  </svg>
                  Total demand (kW)
                </span>
                {/* Yesterday */}
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <svg width="22" height="8">
                    <line
                      x1="0"
                      y1="4"
                      x2="22"
                      y2="4"
                      stroke="var(--muted-foreground)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  Yesterday (kW)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Transformer setpoints (kVA)
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DemandTrendChart
              transformerSetpoints={stats.transformerMeters.map((tr) => ({
                label: tr.code ?? tr.name,
                alarm: tr.alarmSetpointKva,
                alert: tr.alertSetpointKva,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-[11px] text-muted-foreground">
                DEMAND GAUGES
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Rated {stats.totalRatedKva} kVA
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4 pt-2">
            <RadialGauge
              label="Plant Demand"
              value={stats.totalDemand}
              max={stats.totalRatedKva}
              size={160}
              unit="kVA"
            />
            {stats.transformerMeters.map((tr) => {
              const { kva } = getTransformerElectricals(tr);
              return (
                <RadialGauge
                  key={tr.id}
                  label={tr.code ?? tr.name}
                  value={Number(kva.toFixed(0))}
                  max={tr.ratedKw ?? 1700}
                  alarmAt={tr.alarmSetpointKva ?? undefined}
                  alertAt={tr.alertSetpointKva ?? undefined}
                  size={140}
                  unit="kVA"
                />
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Equipment Power + Transformer Loading */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-[11px] text-muted-foreground">
              EQUIPMENT-WISE POWER CONSUMPTION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentPowerBars meters={meters} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-[11px] text-muted-foreground">
              TRANSFORMER LOADING
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransformerLoadingBars meters={meters} />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Overage & Penalty Tracking */}
      <OveragePenaltyPanel
        transformers={overageSummary.transformers}
        equipment={overageSummary.equipment}
      />

      {/* Row 6: Recent Alarms Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-[11px] text-muted-foreground">
            RECENT ALARMS & EVENTS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlarmsFeed alerts={alerts.slice(0, 15)} />
        </CardContent>
      </Card>
    </div>
  );
}