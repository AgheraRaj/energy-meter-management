"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useLiveData } from "@/hooks/use-live-data";
import { useNow } from "@/hooks/use-now";
import { MeterWithReading, Reading } from "@/lib/types";
import { getTransformerElectricals, getTransformerStatus } from "@/lib/transformer";
import { isReadingLive } from "@/lib/meter-live-status";

interface TransformerWithChildren extends MeterWithReading {
  children: MeterWithReading[];
}

interface SldDiagramProps {
  initialTransformers: TransformerWithChildren[];
  alarmSetpointKw: number;
  alertSetpointKw: number;
}

const SLOT_WIDTH = 110;
const MIN_GROUP_WIDTH = 320;
const GROUP_GAP = 150;
const OUTER_MARGIN = 90;
const DIAGRAM_HEIGHT = 620;

// Equipment/transformer status must match Equipment List exactly: a meter
// is "live" only while it's marked active AND a reading has arrived within
// the last 30s (lib/meter-live-status.ts). Anything older is shown as
// "NO DATA" rather than trusting a frozen last-known value.

export function SldDiagram({
  initialTransformers,
  alarmSetpointKw,
  alertSetpointKw,
}: SldDiagramProps) {
  const flatInitialMeters = useMemo(() => {
    const list: MeterWithReading[] = [];
    initialTransformers.forEach((tr) => {
      list.push(tr);
      tr.children.forEach((eq) => list.push(eq));
    });
    return list;
  }, [initialTransformers]);

  const { meters, connected } = useLiveData({
    initialMeters: flatInitialMeters,
  });
  // Ticks every second so equipment that stops sending data still flips to
  // "NO DATA" after 30s — without this, staleness would only ever be
  // re-evaluated when some other meter's reading happens to trigger a render.
  const now = useNow(1000);

  function getKvaAndPf(latestReading: Reading | null) {
    if (!latestReading)
      return { kva: 0, pf: 0.9, voltage: 415, current: 0, powerKw: 0 };
    const { voltage, current, powerKw } = latestReading;
    const kva = (Math.sqrt(3) * voltage * current) / 1000;
    const pf = kva > 0 ? Math.min(1.0, powerKw / kva) : 0.9;
    return { kva, pf, voltage, current, powerKw };
  }

  function getTransformerViewModel(meter: MeterWithReading) {
    const electricals = getTransformerElectricals(meter);
    const { kva, htVoltage, htCurrent, htKva } = electricals;
    const rated = meter.ratedKw ?? 1700;
    const pct = rated > 0 ? (kva / rated) * 100 : 0;
    const stale = meter.status === "active" && !isReadingLive(meter.latestReading?.recordedAt, now);
    // Status comes only from this transformer's own configured setpoints —
    // never a hardcoded % of rated capacity. See lib/transformer.ts.
    const status = getTransformerStatus(meter, kva);
    let color =
      status === "alert"
        ? "var(--accent-red)"
        : status === "alarm"
          ? "var(--accent-amber)"
          : "var(--accent-green)";
    let label: string | null = null;

    if (meter.status === "offline") {
      color = "var(--muted-foreground)";
      label = "OFFLINE";
    } else if (meter.status === "maintenance") {
      color = "var(--accent-amber)";
      label = "MAINTENANCE";
    } else if (stale) {
      color = "var(--muted-foreground)";
      label = "NO DATA";
    }

    return { kva, pct, color, htVoltage, htCurrent, htKva, label, stale };
  }

  function getEquipmentStatus(meter: MeterWithReading) {
    const { kva, pf, voltage, current, powerKw } = getKvaAndPf(meter.latestReading);
    const max = meter.maxPowerKw ?? (meter.ratedKw ? meter.ratedKw * 0.9 : 100);
    const stale = meter.status === "active" && !isReadingLive(meter.latestReading?.recordedAt, now);

    let color = "var(--accent-green)";
    let label: string | null = null;

    if (meter.status === "offline") {
      color = "var(--muted-foreground)";
      label = "OFFLINE";
    } else if (meter.status === "maintenance") {
      color = "var(--accent-amber)";
      label = "MAINTENANCE";
    } else if (stale) {
      color = "var(--muted-foreground)";
      label = "NO DATA";
    } else if (powerKw >= max) {
      // Fixed: breaching the configured threshold is Critical/Red immediately —
      // no longer gated behind also being near 98% of rated capacity.
      color = "var(--accent-red)";
    }

    return { kva, pf, voltage, current, powerKw, color, label, stale };
  }

  const transformersWithLiveValues = useMemo(() => {
    return initialTransformers.map((tr) => {
      const liveTr = meters.find((m) => m.id === tr.id) || tr;
      const liveChildren = tr.children.map(
        (child) => meters.find((m) => m.id === child.id) || child,
      );
      return { ...liveTr, children: liveChildren };
    });
  }, [meters, initialTransformers]);

  const layout = useMemo(() => {
    let cursorX = OUTER_MARGIN;
    const groups = transformersWithLiveValues.map((tr) => {
      const groupWidth = Math.max(
        MIN_GROUP_WIDTH,
        tr.children.length * SLOT_WIDTH + 40,
      );
      const busX1 = cursorX + 20;
      const busX2 = cursorX + groupWidth - 20;
      const xCenter = cursorX + groupWidth / 2;
      const groupStart = cursorX;
      const groupEnd = cursorX + groupWidth;
      cursorX = groupEnd + GROUP_GAP;
      return { tr, groupWidth, busX1, busX2, xCenter, groupStart, groupEnd };
    });
    const viewBoxWidth =
      groups.length > 0
        ? groups[groups.length - 1].groupEnd + OUTER_MARGIN
        : 800;
    const dividerXs = groups
      .slice(0, -1)
      .map((g, i) => (g.groupEnd + groups[i + 1].groupStart) / 2);
    return { groups, viewBoxWidth, dividerXs };
  }, [transformersWithLiveValues]);

  function renderGroupSVG(
    tr: MeterWithReading,
    xCenter: number,
    busX1: number,
    busX2: number,
    equipList: MeterWithReading[],
  ) {
    const trStatus = getTransformerViewModel(tr);
    const n = equipList.length;
    const cellW = n > 0 ? (busX2 - busX1) / n : busX2 - busX1;

    return (
      <g key={tr.id}>
        <line x1={xCenter} y1={18} x2={xCenter} y2={55} stroke="var(--muted-foreground)" strokeWidth={2} />
        <text x={xCenter} y={10} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-display font-semibold tracking-wider">
          UTILITY GRID INCOMER
        </text>

        <rect x={xCenter - 7} y={55} width={14} height={14} fill="var(--card)" stroke={trStatus.color} strokeWidth={2} />
        <text x={xCenter + 18} y={60} textAnchor="start" fill="var(--accent-amber)" fontSize={10} className="font-display font-semibold">
          11 kV HT LINE
        </text>
        <text x={xCenter + 18} y={73} textAnchor="start" fill="var(--muted-foreground)" fontSize={9} className="font-mono-ems tabular-nums">
          {trStatus.label ? trStatus.label : `${trStatus.htCurrent.toFixed(1)} A · ${trStatus.htKva.toFixed(0)} kVA`}
        </text>

        <line x1={xCenter} y1={69} x2={xCenter} y2={100} stroke="var(--muted-foreground)" strokeWidth={2} />
        <circle cx={xCenter} cy={125} r={24} fill="none" stroke="var(--accent-cyan)" strokeWidth={2.5} />
        <circle cx={xCenter} cy={163} r={24} fill="none" stroke="var(--accent-cyan)" strokeWidth={2.5} />
        <text x={xCenter + 34} y={140} textAnchor="start" fill="var(--foreground)" fontSize={10} className="font-mono-ems">
          Rated
        </text>
        <text x={xCenter + 34} y={153} textAnchor="start" fill="var(--accent-cyan)" fontSize={11} className="font-mono-ems font-semibold">
          {tr.ratedKw} kVA
        </text>

        <line x1={xCenter} y1={187} x2={xCenter} y2={220} stroke="var(--muted-foreground)" strokeWidth={2} />
        <rect x={xCenter - 8} y={220} width={16} height={16} fill="var(--card)" stroke={trStatus.color} strokeWidth={2} />
        <text x={xCenter + 20} y={232} textAnchor="start" fill="var(--foreground)" fontSize={12} className="font-display font-bold">
          {tr.code}
        </text>

        <line x1={xCenter} y1={236} x2={xCenter} y2={340} stroke="var(--muted-foreground)" strokeWidth={2} />
        <text x={xCenter + 34} y={278} textAnchor="start" fill={trStatus.label ? "var(--muted-foreground)" : "var(--accent-cyan)"} fontSize={13} className="font-display font-bold">
          {trStatus.label ?? `${trStatus.kva.toFixed(0)} kVA`}
        </text>
        <text x={xCenter + 34} y={294} textAnchor="start" fill="var(--muted-foreground)" fontSize={10} className="font-mono-ems tabular-nums">
          {trStatus.label ? "\u2014" : `${trStatus.pct.toFixed(1)}% loaded`}
        </text>

        <line x1={busX1} y1={340} x2={busX2} y2={340} stroke="var(--accent-cyan)" strokeWidth={4} />
        <text x={busX1} y={330} textAnchor="start" fill="var(--muted-foreground)" fontSize={10} className="font-mono-ems">
          {tr.bus} — 415V, 3Φ, 50Hz
        </text>

        {n === 0 ? (
          <text x={xCenter} y={370} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>
            No downstream loads configured
          </text>
        ) : (
          equipList.map((e, i) => {
            const cx = busX1 + cellW * i + cellW / 2;
            const boxW = cellW - 14;
            const boxX = cx - boxW / 2;
            const eqStatus = getEquipmentStatus(e);

            return (
              <g key={e.id}>
                <line x1={cx} y1={340} x2={cx} y2={410} stroke="var(--muted-foreground)" strokeWidth={1.5} />
                <rect x={cx - 6} y={410} width={12} height={12} fill="var(--card)" stroke={eqStatus.color} strokeWidth={1.5} />
                <line x1={cx} y1={422} x2={cx} y2={460} stroke="var(--muted-foreground)" strokeWidth={1.5} />
                <rect x={boxX} y={460} width={boxW} height={86} rx={6} fill="var(--card)" stroke={eqStatus.color} strokeWidth={1.8} />
                <text x={cx} y={478} textAnchor="middle" fill="var(--foreground)" fontSize={10} className="font-display font-bold">
                  {e.code}
                </text>
                <text x={cx} y={491} textAnchor="middle" fill="var(--muted-foreground)" fontSize={7.5} className="font-display">
                  {e.name.length > 15 ? e.name.slice(0, 14) + "..." : e.name}
                </text>
                <text x={cx} y={509} textAnchor="middle" fill={eqStatus.color} fontSize={eqStatus.label ? 9.5 : 12} className="font-mono-ems font-bold tabular-nums">
                  {eqStatus.label ?? `${eqStatus.powerKw.toFixed(0)} kW`}
                </text>
                <text x={cx} y={523} textAnchor="middle" fill="var(--muted-foreground)" fontSize={8.5} className="font-mono-ems tabular-nums">
                  {eqStatus.label ? "\u2014 A" : `${eqStatus.current.toFixed(0)} A`}
                </text>
                <text x={cx} y={536} textAnchor="middle" fill="var(--muted-foreground)" fontSize={8.5} className="font-mono-ems tabular-nums">
                  {eqStatus.label ? "PF \u2014" : `PF ${eqStatus.pf.toFixed(2)}`}
                </text>
              </g>
            );
          })
        )}
      </g>
    );
  }

  return (
    <Card className="w-full border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="font-display text-[13px] text-muted-foreground">
            SINGLE LINE DIAGRAM — FULL PLANT
          </CardTitle>
          <CardDescription>
            {layout.groups.length} independent incoming{" "}
            {layout.groups.length === 1 ? "grid" : "grids"} feeding separate buses, no electrical tie link
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-ems">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`} />
          {connected ? "Live Update" : "Reconnecting..."}
        </div>
      </CardHeader>
      <CardContent>
        {layout.groups.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No transformer meters configured yet
          </div>
        ) : (
          <svg id="sld-svg" viewBox={`0 0 ${layout.viewBoxWidth} ${DIAGRAM_HEIGHT}`} style={{ width: "100%", height: "auto" }} className="select-none">
            {layout.groups.map((g) => renderGroupSVG(g.tr, g.xCenter, g.busX1, g.busX2, g.tr.children))}

            {layout.dividerXs.map((x, i) => (
              <g key={i}>
                <line x1={x} y1={250} x2={x} y2={560} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="6,6" />
                <text x={x} y={238} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-display font-semibold">
                  ⚠️ NO BUS TIE
                </text>
                <text x={x} y={578} textAnchor="middle" fill="var(--muted-foreground)" fontSize={9} className="font-mono-ems">
                  independent buses
                </text>
              </g>
            ))}
          </svg>
        )}

        <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-green)] inline-block" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-amber)] inline-block" />
            Alarm (≥ {alarmSetpointKw} kW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-red)] inline-block" />
            Alert (≥ {alertSetpointKw} kW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-muted-foreground inline-block" />
            Offline / Maintenance / No Data
          </span>
        </div>
      </CardContent>
    </Card>
  );
}