"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLiveData } from "@/hooks/use-live-data";
import { MeterWithReading, Reading } from "@/lib/types";

interface TransformerWithChildren extends MeterWithReading {
  children: MeterWithReading[];
}

interface SldDiagramProps {
  initialTransformers: TransformerWithChildren[];
  alarmSetpointKw: number;
  alertSetpointKw: number;
}

export function SldDiagram({
  initialTransformers,
  alarmSetpointKw,
  alertSetpointKw,
}: SldDiagramProps) {
  // Flat list of all meters for the live data hook
  const flatInitialMeters = useMemo(() => {
    const list: MeterWithReading[] = [];
    initialTransformers.forEach((tr) => {
      list.push(tr);
      tr.children.forEach((eq) => {
        list.push(eq);
      });
    });
    return list;
  }, [initialTransformers]);

  const { meters, connected } = useLiveData({ initialMeters: flatInitialMeters });

  // Helper: compute kVA and PF for a meter
  function getKvaAndPf(latestReading: Reading | null) {
    if (!latestReading) return { kva: 0, pf: 0.9, voltage: 415, current: 0, powerKw: 0 };
    const { voltage, current, powerKw } = latestReading;
    const kva = (Math.sqrt(3) * voltage * current) / 1000;
    const pf = kva > 0 ? Math.min(1.0, powerKw / kva) : 0.9;
    return { kva, pf, voltage, current, powerKw };
  }

  // Helper: get transformer color & loading status
  function getTransformerStatus(meter: MeterWithReading) {
    const { kva, voltage, current } = getKvaAndPf(meter.latestReading);
    const rated = meter.ratedKw ?? 1700;
    const pct = rated > 0 ? (kva / rated) * 100 : 0;
    
    let status: "normal" | "alarm" | "alert" = "normal";
    let color = "var(--accent-green)";
    
    if (pct >= 95) {
      status = "alert";
      color = "var(--accent-red)";
    } else if (pct >= 80) {
      status = "alarm";
      color = "var(--accent-amber)";
    }

    // HT side parameters (simulated from LT values as in the VoltIQ reference)
    const htVoltage = Math.round(voltage * (11000 / 415));
    const htKva = kva / 0.985; // reflect loss
    const htCurrent = htVoltage > 0 ? (htKva * 1000) / (Math.sqrt(3) * htVoltage) : 0;

    return { kva, pct, status, color, htVoltage, htCurrent, htKva };
  }

  // Helper: get equipment color & status
  function getEquipmentStatus(meter: MeterWithReading) {
    const { kva, pf, voltage, current, powerKw } = getKvaAndPf(meter.latestReading);
    const max = meter.maxPowerKw ?? (meter.ratedKw ? meter.ratedKw * 0.9 : 100);
    const rated = meter.ratedKw ?? 100;
    
    let status: "normal" | "alarm" | "alert" | "offline" | "maintenance" = "normal";
    let color = "var(--accent-green)";

    if (meter.status === "offline") {
      color = "var(--muted-foreground)";
      status = "offline";
    } else if (meter.status === "maintenance") {
      color = "var(--accent-amber)";
      status = "maintenance";
    } else if (powerKw >= max) {
      if (powerKw >= rated * 0.98) {
        status = "alert";
        color = "var(--accent-red)";
      } else {
        status = "alarm";
        color = "var(--accent-amber)";
      }
    }

    return { kva, pf, voltage, current, powerKw, status, color };
  }

  // Group real-time updated meters back into transformers with children
  const transformersWithLiveValues = useMemo(() => {
    return initialTransformers.map((tr) => {
      const liveTr = meters.find((m) => m.id === tr.id) || tr;
      const liveChildren = tr.children.map((child) => meters.find((m) => m.id === child.id) || child);
      return {
        ...liveTr,
        children: liveChildren,
      };
    });
  }, [meters, initialTransformers]);

  function renderGroupSVG(
    tr: MeterWithReading,
    xCenter: number,
    busX1: number,
    busX2: number,
    equipList: MeterWithReading[]
  ) {
    const trStatus = getTransformerStatus(tr);
    const n = equipList.length;
    const cellW = (busX2 - busX1) / n;

    return (
      <g key={tr.id}>
        {/* HT incoming grid lines */}
        <line x1={xCenter} y1={18} x2={xCenter} y2={55} stroke="var(--muted-foreground)" strokeWidth={2} />
        <text x={xCenter} y={10} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-display font-semibold tracking-wider">
          UTILITY GRID INCOMER
        </text>
        
        {/* HT Breaker */}
        <rect
          x={xCenter - 7}
          y={55}
          width={14}
          height={14}
          fill="var(--card)"
          stroke={trStatus.color}
          strokeWidth={2}
        />
        <text x={xCenter + 18} y={60} textAnchor="start" fill="var(--accent-amber)" fontSize={10} className="font-display font-semibold">
          11 kV HT LINE
        </text>
        <text x={xCenter + 18} y={73} textAnchor="start" fill="var(--muted-foreground)" fontSize={9} className="font-mono-ems tabular-nums">
          {trStatus.htCurrent.toFixed(1)} A · {trStatus.htKva.toFixed(0)} kVA
        </text>

        {/* Cable line to transformer */}
        <line x1={xCenter} y1={69} x2={xCenter} y2={100} stroke="var(--muted-foreground)" strokeWidth={2} />
        
        {/* Transformer overlap circle symbol */}
        <circle cx={xCenter} cy={125} r={24} fill="none" stroke="var(--accent-cyan)" strokeWidth={2.5} />
        <circle cx={xCenter} cy={163} r={24} fill="none" stroke="var(--accent-cyan)" strokeWidth={2.5} />
        <text x={xCenter} y={148} textAnchor="middle" fill="var(--foreground)" fontSize={10} className="font-mono-ems">
          {tr.ratedKw} kVA
        </text>

        {/* Secondary line to LT breaker */}
        <line x1={xCenter} y1={187} x2={xCenter} y2={220} stroke="var(--muted-foreground)" strokeWidth={2} />
        
        {/* LT Breaker */}
        <rect
          x={xCenter - 8}
          y={220}
          width={16}
          height={16}
          fill="var(--card)"
          stroke={trStatus.color}
          strokeWidth={2}
        />
        <text x={xCenter} y={210} textAnchor="middle" fill="var(--foreground)" fontSize={11} className="font-display font-bold">
          {tr.code}
        </text>

        {/* Outgoing feeder line to bus */}
        <line x1={xCenter} y1={236} x2={xCenter} y2={340} stroke="var(--muted-foreground)" strokeWidth={2} />

        {/* Transformer Load Text */}
        <text x={xCenter} y={295} textAnchor="middle" fill="var(--accent-cyan)" fontSize={13} className="font-display font-bold">
          {trStatus.kva.toFixed(0)} kVA
        </text>
        <text x={xCenter} y={312} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-mono-ems tabular-nums">
          {trStatus.pct.toFixed(1)}% loaded
        </text>

        {/* Busbar Line */}
        <line x1={busX1} y1={340} x2={busX2} y2={340} stroke="var(--accent-cyan)" strokeWidth={4} />
        <text x={xCenter} y={330} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-mono-ems">
          {tr.bus} — 415V, 3Φ, 50Hz
        </text>

        {/* Downstream Loads */}
        {equipList.map((e, i) => {
          const cx = busX1 + cellW * i + cellW / 2;
          const boxW = cellW - 14;
          const boxX = cx - boxW / 2;
          const eqStatus = getEquipmentStatus(e);

          return (
            <g key={e.id}>
              {/* Feeder line from bus to breaker */}
              <line x1={cx} y1={340} x2={cx} y2={410} stroke="var(--muted-foreground)" strokeWidth={1.5} />
              
              {/* Breaker symbol */}
              <rect
                x={cx - 6}
                y={410}
                width={12}
                height={12}
                fill="var(--card)"
                stroke={eqStatus.color}
                strokeWidth={1.5}
              />
              
              {/* Feeder line from breaker to load box */}
              <line x1={cx} y1={422} x2={cx} y2={460} stroke="var(--muted-foreground)" strokeWidth={1.5} />

              {/* Load box container */}
              <rect
                x={boxX}
                y={460}
                width={boxW}
                height={86}
                rx={6}
                fill="var(--card)"
                stroke={eqStatus.color}
                strokeWidth={1.8}
              />
              
              {/* Labels inside box */}
              <text x={cx} y={478} textAnchor="middle" fill="var(--foreground)" fontSize={10} className="font-display font-bold">
                {e.code}
              </text>
              <text x={cx} y={491} textAnchor="middle" fill="var(--muted-foreground)" fontSize={7.5} className="font-display">
                {e.name.length > 15 ? e.name.slice(0, 14) + "..." : e.name}
              </text>
              <text x={cx} y={509} textAnchor="middle" fill={eqStatus.color} fontSize={12} className="font-mono-ems font-bold tabular-nums">
                {e.status === "active" ? `${eqStatus.powerKw.toFixed(0)} kW` : e.status.toUpperCase()}
              </text>
              <text x={cx} y={523} textAnchor="middle" fill="var(--muted-foreground)" fontSize={8.5} className="font-mono-ems tabular-nums">
                {e.status === "active" ? `${eqStatus.current.toFixed(0)} A` : "-- A"}
              </text>
              <text x={cx} y={536} textAnchor="middle" fill="var(--muted-foreground)" fontSize={8.5} className="font-mono-ems tabular-nums">
                {e.status === "active" ? `PF ${eqStatus.pf.toFixed(2)}` : "PF --"}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  const tr1 = transformersWithLiveValues[0];
  const tr2 = transformersWithLiveValues[1];

  return (
    <Card className="w-full border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="font-display text-[13px] text-muted-foreground">SINGLE LINE DIAGRAM — FULL PLANT</CardTitle>
          <CardDescription>
            Two independent incoming grids feeding separate buses, no electrical tie link
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-ems">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`} />
          {connected ? "Live Update" : "Reconnecting..."}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px] w-full">
            <svg
              id="sld-svg"
              viewBox="0 0 1500 620"
              style={{ width: "100%", height: "auto" }}
              className="select-none"
            >
              {tr1 && renderGroupSVG(tr1, 380, 90, 700, tr1.children)}
              {tr2 && renderGroupSVG(tr2, 1120, 800, 1410, tr2.children)}

              {/* No bus coupler label and line divider */}
              <line x1={750} y1={250} x2={750} y2={560} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="6,6" />
              <text x={750} y={238} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} className="font-display font-semibold">
                ⚠️ NO BUS TIE
              </text>
              <text x={750} y={578} textAnchor="middle" fill="var(--muted-foreground)" fontSize={9} className="font-mono-ems">
                independent buses
              </text>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-green)] inline-block" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-amber)] inline-block" />
            Alarm (≥ notify threshold)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-red)] inline-block" />
            Alert (near full load / critical)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-muted-foreground inline-block" />
            Offline / Maintenance
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
