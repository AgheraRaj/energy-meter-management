"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Zap,
  Gauge as GaugeIcon,
  BatteryCharging,
  AlertTriangle,
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { MeterWithReading, AlertWithMeter, Reading } from "@/lib/types";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";
import { useLiveData } from "@/hooks/use-live-data";
import { getTransformerElectricals, getTransformerStatus } from "@/lib/transformer";
import { OveragePenaltyPanel } from "./overage-penalty-panel";
import { OverageSummaryRow } from "@/lib/data/overage";
import { EquipmentChartData } from "@/lib/data/equipment-chart";

interface DashboardOverviewProps {
  overageSummary: { transformers: OverageSummaryRow[]; equipment: OverageSummaryRow[] };
  initialMeters: MeterWithReading[];
  initialAlerts: AlertWithMeter[];
  settings: {
    ratePerKwh: number;
  };
  last24h: { totalConsumptionKwh: number; totalCost: number };
  periodEnergyKwh: number;
  peakPlantDemandKva: number;
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
  initialEquipmentChartData: EquipmentChartData;
  initialEquipmentChartError: string | null;
  filter: "today" | "billing";
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
              {billingCycle.consumptionKwh.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
              <span className="text-sm text-muted-foreground font-sans font-normal"> kWh</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Rs. {billingCycle.cost.toLocaleString("en-IN", { maximumFractionDigits: 2 })} at Rs. {ratePerKwh}/kWh
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

// ─── Power Demand Trend Charts (Per Transformer) ──────────────────────────────
function PowerDemandTrendCharts({
  transformers,
}: {
  transformers: MeterWithReading[];
}) {
  const [data, setData] = useState<Record<number, { idx: number; time: string; kva: number; yesterdayKva: number }[]>>({});

  useEffect(() => {
    fetch("/api/dashboard/transformer-trend?minutes=1440&samples=96")
      .then((r) => r.json())
      .then((pts) => {
        setData(pts);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {transformers.map((tr) => {
        const pts = data[tr.id] || [];
        return (
          <Card key={tr.id} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-[13px] text-muted-foreground uppercase">
                {tr.code ?? tr.name} Power Demand Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Last 24 hours vs Yesterday (kVA)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={pts} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="idx"
                    type="number"
                    domain={[0, 95]}
                    tickCount={9}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    unit=" kVA"
                    width={56}
                    domain={[(dataMin: number) => Math.floor(dataMin / 50) * 50, (dataMax: number) => Math.ceil(Math.max(dataMax, tr.alarmSetpointKva ?? 0, tr.alertSetpointKva ?? 0) * 1.1 / 50) * 50]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontSize: 11,
                    }}
                    labelFormatter={(idx) => {
                      const pt = pts[idx as number];
                      return pt
                        ? new Date(pt.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                        : `Sample ${idx}`;
                    }}
                    formatter={
                      ((v: any, name: any) => [
                        `${v} kVA`,
                        name === "kva" ? "Today" : "Yesterday",
                      ]) as any
                    }
                  />
                  {tr.alarmSetpointKva && (
                    <ReferenceLine
                      y={tr.alarmSetpointKva}
                      stroke="var(--accent-amber)"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: `Alarm ${tr.alarmSetpointKva}`, position: "insideTopRight", fontSize: 9, fill: "var(--accent-amber)" }}
                    />
                  )}
                  {tr.alertSetpointKva && (
                    <ReferenceLine
                      y={tr.alertSetpointKva}
                      stroke="var(--accent-red)"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: `Alert ${tr.alertSetpointKva}`, position: "insideTopRight", fontSize: 9, fill: "var(--accent-red)" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="yesterdayKva"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 3"
                    name="yesterdayKva"
                  />
                  <Line
                    type="monotone"
                    dataKey="kva"
                    stroke="var(--accent-cyan)"
                    strokeWidth={2}
                    dot={false}
                    name="kva"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Equipment Power Bar Chart ────────────────────────────────────────────────
function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function EquipmentPowerBars({
  meters,
  peakPowerByMeter,
}: {
  meters: MeterWithReading[];
  peakPowerByMeter: Record<number, number>;
}) {
  const [livePeaks, setLivePeaks] = useState(peakPowerByMeter);

  useEffect(() => setLivePeaks(peakPowerByMeter), [peakPowerByMeter]);

  useEffect(() => {
    setLivePeaks((previous) => {
      const next = { ...previous };
      meters
        .filter((meter) => meter.type === "equipment")
        .forEach((meter) => {
          next[meter.id] = Math.max(next[meter.id] ?? 0, meter.latestReading?.powerKw ?? 0);
        });
      return next;
    });
  }, [meters]);

  const equipment = meters
    .filter((m) => m.type === "equipment")
    .map((m) => {
      const power = m.latestReading?.powerKw ?? 0;
      return {
        name: m.code ?? m.name,
        rated: Number((m.ratedKw ?? 0).toFixed(1)),
        peak: Number((livePeaks[m.id] ?? 0).toFixed(1)),
        current: Number(power.toFixed(1)),
      };
    });

  if (equipment.length === 0) return <ChartMessage>No equipment meters are configured yet.</ChartMessage>;

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
          formatter={((value: number, name: string) => [
            `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 })} kW`,
            name,
          ]) as any}
        />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Bar dataKey="rated" name="Rated Power" stackId="power" fill="var(--muted-foreground)" />
        <Bar dataKey="peak" name="Peak Power" stackId="power" fill="var(--accent-amber)" />
        <Bar dataKey="current" name="Current Power" stackId="power" fill="var(--accent-cyan)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Transformer Loading Bar Chart ────────────────────────────────────────────
// ─── Recent Alarms Feed ───────────────────────────────────────────────────────
function EquipmentEnergyBars({
  data,
  loading,
  error,
}: {
  data: EquipmentChartData["energy"];
  loading: boolean;
  error: string | null;
}) {
  if (loading && data.data.length === 0) return <ChartMessage>Loading equipment energy consumption...</ChartMessage>;
  if (error) return <ChartMessage>{error}</ChartMessage>;
  if (data.data.length === 0) return <ChartMessage>No equipment energy readings are available for this period.</ChartMessage>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} unit=" kWh" />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={((value: number, name: string) => [
            `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kWh`,
            name,
          ]) as any}
        />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Bar dataKey="previousKwh" name={data.previousLabel} fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="currentKwh" name={data.currentLabel} fill="var(--accent-green)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

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
  periodEnergyKwh,
  peakPlantDemandKva,
  monthlyPeaks,
  billingCycle,
  overageSummary,
  initialEquipmentChartData,
  initialEquipmentChartError,
  filter,
}: DashboardOverviewProps) {
  const { meters, alerts } = useLiveData({ initialMeters, initialAlerts });
  const router = useRouter();
  const pathname = usePathname();
  const [livePeakPlantDemandKva, setLivePeakPlantDemandKva] = useState(peakPlantDemandKva);
  const [equipmentChartData, setEquipmentChartData] = useState(initialEquipmentChartData);
  const [equipmentChartError, setEquipmentChartError] = useState<string | null>(initialEquipmentChartError);
  const [equipmentChartLoading, setEquipmentChartLoading] = useState(false);
  const latestEquipmentReading = useMemo(
    () => meters
      .filter((meter) => meter.type === "equipment")
      .map((meter) => meter.latestReading?.recordedAt ?? "")
      .join("|"),
    [meters],
  );

  useEffect(() => {
    const controller = new AbortController();
    const refresh = window.setTimeout(async () => {
      setEquipmentChartLoading(true);
      try {
        const response = await fetch(`/api/dashboard/equipment-chart?filter=${filter}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load equipment chart data.");
        setEquipmentChartData(payload);
        setEquipmentChartError(null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setEquipmentChartError(error instanceof Error ? error.message : "Unable to load equipment chart data.");
        }
      } finally {
        if (!controller.signal.aborted) setEquipmentChartLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(refresh);
    };
  }, [filter, latestEquipmentReading]);

  const updateFilter = (newFilter: string | null) => {
    if (newFilter) {
      router.push(`${pathname}?filter=${newFilter}`);
    }
  };

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

    return {
      totalDemand: Number(totalDemand.toFixed(1)),
      totalRatedKva: Number(totalRatedKva.toFixed(1)),
      loadingPct: Number(loadingPct.toFixed(1)),
      activeAlertsCount: activeAlerts.length,
      criticalCount,
      warningCount,
      plantStatus,
      transformerMeters,
      equipmentMeters,
    };
  }, [meters, alerts]);

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

  // Reset to the server-calculated peak when the selected period changes.
  useEffect(() => {
    setLivePeakPlantDemandKva(peakPlantDemandKva);
  }, [filter, peakPlantDemandKva]);

  // Preserve a high-water mark as live transformer readings arrive.
  useEffect(() => {
    setLivePeakPlantDemandKva((currentPeak) => Math.max(currentPeak, stats.totalDemand));
  }, [stats.totalDemand]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold tracking-tight">Dashboard Overview</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase font-display tracking-wide">Date Filter</span>
          <Select value={filter} onValueChange={updateFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" className="text-xs">Today</SelectItem>
              <SelectItem value="billing" className="text-xs">Billing Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Current Plant Demand */}
        <Card
          className={cn(
            "border-t-2 border-t-[var(--accent-cyan)]",
          )}
        >
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground">
                CURRENT PLANT DEMAND
              </span>
              <Zap className="h-4 w-4 text-[var(--accent-cyan)]" />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {stats.totalDemand}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kVA
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Peak Power Demand{" "}
              {livePeakPlantDemandKva.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kVA
            </p>
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

        {/* Energy Today/Cycle */}
        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] text-muted-foreground uppercase">
                {filter === "today" ? "ENERGY TODAY" : "ENERGY THIS CYCLE"}
              </span>
              <BatteryCharging className="h-4 w-4 text-[var(--accent-green)]" />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {periodEnergyKwh.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kWh
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "today" ? "Since midnight" : "Since billing cycle start"}
            </p>
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
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-[10px] text-muted-foreground uppercase">
            TRANSFORMER DEMAND — {filter === "today" ? "TODAY" : "THIS CYCLE"}
          </p>
        </div>
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

      {/* Row 3: Power Demand Trend Charts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-[10px] text-muted-foreground uppercase">
            POWER DEMAND TREND (24H)
          </p>
        </div>
        <PowerDemandTrendCharts transformers={stats.transformerMeters} />
      </div>

      {/* Row 4: Equipment Power + Energy */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-[11px] text-muted-foreground">
              EQUIPMENT-WISE PEAK POWER DEMAND
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentPowerBars meters={meters} peakPowerByMeter={equipmentChartData.peakPowerByMeter} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-[11px] text-muted-foreground">
              EQUIPMENT-WISE ENERGY CONSUMPTION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentEnergyBars
              data={equipmentChartData.energy}
              loading={equipmentChartLoading}
              error={equipmentChartError}
            />
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
