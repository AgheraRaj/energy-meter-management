"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLiveData } from "@/hooks/use-live-data";
import { MeterWithReading, Reading } from "@/lib/types";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";

interface MetersGridProps {
  initialMeters: MeterWithReading[];
  monthlyPeaks: Record<number, number>; // meterId -> max kW/kVA
}

export function MetersGrid({ initialMeters, monthlyPeaks }: MetersGridProps) {
  const router = useRouter();
  const { meters, connected } = useLiveData({ initialMeters });

  // Separate transformers and equipment
  const transformers = useMemo(() => meters.filter((m) => m.type === "transformer"), [meters]);
  const equipment = useMemo(() => meters.filter((m) => m.type === "equipment"), [meters]);

  // Helper: compute details
  function getMeterMetrics(m: MeterWithReading) {
    const latest = m.latestReading;
    const voltage = latest?.voltage ?? 415;
    const current = latest?.current ?? 0;
    const powerKw = latest?.powerKw ?? 0;
    const energyKwh = latest?.energyKwh ?? 0;

    const kva = (Math.sqrt(3) * voltage * current) / 1000;
    const pf = kva > 0 ? Math.min(1.0, powerKw / kva) : 0.9;
    
    // Simulated Freq
    const seedHash = m.id * 13;
    const freq = 50.0 + ((seedHash % 7) - 3) * 0.02 + (connected ? (Math.random() - 0.5) * 0.04 : 0);

    const rated = m.ratedKw ?? 100;
    const loadPct = rated > 0 ? (powerKw / rated) * 100 : 0;

    // Status Level
    const maxLimit = m.maxPowerKw ?? rated * 0.9;
    let alarmStatus: StatusLevel = "normal";
    
    if (m.status === "offline") alarmStatus = "offline";
    else if (m.status === "maintenance") alarmStatus = "maintenance";
    else if (powerKw >= maxLimit) {
      if (powerKw >= rated * 0.98) alarmStatus = "alert";
      else alarmStatus = "alarm";
    }

    return {
      voltage,
      current,
      powerKw,
      energyKwh,
      kva,
      pf,
      freq,
      loadPct,
      alarmStatus,
    };
  }

  return (
    <div className="space-y-6">
      {/* Live Status indicator */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground font-mono-ems">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`} />
        {connected ? "Live Update" : "Reconnecting..."}
      </div>

      {/* SECTION 1: Transformer Meters */}
      <div className="space-y-3">
        <h2 className="font-display text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Transformer Incomer Meters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transformers.map((tr) => {
            const metrics = getMeterMetrics(tr);
            const peakKva = monthlyPeaks[tr.id] ? monthlyPeaks[tr.id] * 1.015 : (tr.ratedKw ? tr.ratedKw * 0.75 : 1200);
            
            // HT calculations
            const htVoltage = metrics.voltage * (11000 / 415);
            const htKva = metrics.kva / 0.985;
            const htCurrent = htVoltage > 0 ? (htKva * 1000) / (Math.sqrt(3) * htVoltage) : 0;
            const htMaxKva = peakKva / 0.985;

            return (
              <Card
                key={tr.id}
                className="cursor-pointer hover:bg-muted/10 transition-colors border"
                onClick={() => router.push(`/meters/${tr.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-semibold">{tr.name}</CardTitle>
                    <CardDescription>{tr.location || "Substation"}</CardDescription>
                  </div>
                  <StatusPill status={metrics.alarmStatus} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* LT SIDE */}
                  <div>
                    <p className="text-[10px] font-display text-muted-foreground tracking-wider mb-2">
                      LT SIDE · 415 V, 3-PHASE, 50 HZ
                    </p>
                    <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs font-mono-ems">
                      <div>
                        <p className="text-muted-foreground text-[10px]">V AVG (LT)</p>
                        <p className="font-bold tabular-nums text-foreground">{metrics.voltage.toFixed(0)} V</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">A AVG (LT)</p>
                        <p className="font-bold tabular-nums text-foreground">{metrics.current.toFixed(1)} A</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">POWER FACTOR</p>
                        <p className="font-bold tabular-nums text-foreground">{metrics.pf.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">FREQUENCY</p>
                        <p className="font-bold tabular-nums text-foreground">{metrics.freq.toFixed(2)} Hz</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">ENERGY (kWh)</p>
                        <p className="font-bold tabular-nums text-emerald-500">{metrics.energyKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">MAX DEMAND</p>
                        <p className="font-bold tabular-nums text-[var(--accent-cyan)]">{peakKva.toFixed(0)} kVA</p>
                      </div>
                    </div>
                  </div>

                  {/* HT SIDE */}
                  <div className="pt-3 border-t border-dashed">
                    <p className="text-[10px] font-display text-amber-500 tracking-wider mb-2">
                      HT SIDE · 11 KV INCOMER
                    </p>
                    <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs font-mono-ems">
                      <div>
                        <p className="text-muted-foreground text-[10px]">HT V AVG</p>
                        <p className="font-bold tabular-nums text-foreground">{(htVoltage / 1000).toFixed(2)} kV</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">HT A AVG</p>
                        <p className="font-bold tabular-nums text-foreground">{htCurrent.toFixed(1)} A</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">HT DEMAND / MAX</p>
                        <p className="font-bold tabular-nums text-[var(--accent-cyan)]">
                          {htKva.toFixed(0)} / {htMaxKva.toFixed(0)} <span className="font-sans font-normal text-muted-foreground text-[9px]">kVA</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Equipment Meters */}
      <div className="space-y-3 pt-4">
        <h2 className="font-display text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Equipment Load Meters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipment.map((eq) => {
            const metrics = getMeterMetrics(eq);
            const peakKw = monthlyPeaks[eq.id] ?? (eq.ratedKw ? eq.ratedKw * 0.8 : 80);
            
            const isAlerting = metrics.alarmStatus === "alert";
            const isWarning = metrics.alarmStatus === "alarm";

            return (
              <Card
                key={eq.id}
                className={`cursor-pointer hover:bg-muted/10 transition-all border ${
                  isAlerting
                    ? "border-[var(--accent-red)] shadow-sm shadow-red-500/10"
                    : isWarning
                    ? "border-[var(--accent-amber)] shadow-sm shadow-amber-500/10"
                    : "border-border"
                }`}
                onClick={() => router.push(`/meters/${eq.id}`)}
              >
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{eq.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground font-mono-ems">{eq.feederCode || "—"} · {eq.bus || "—"}</p>
                  </div>
                  <StatusPill status={metrics.alarmStatus} size="sm" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] font-mono-ems">
                    <div>
                      <p className="text-[9px] text-muted-foreground">POWER (kW)</p>
                      <p className="font-bold tabular-nums text-[var(--accent-cyan)]">
                        {eq.status === "active" ? `${metrics.powerKw.toFixed(1)} kW` : "OFFLINE"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">LOAD %</p>
                      <p className="font-bold tabular-nums">
                        {eq.status === "active" ? `${metrics.loadPct.toFixed(0)}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">V AVG / A AVG</p>
                      <p className="font-bold tabular-nums text-foreground/80">
                        {eq.status === "active" ? `${metrics.voltage.toFixed(0)}V / ${metrics.current.toFixed(0)}A` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">PF / FREQ</p>
                      <p className="font-bold tabular-nums text-foreground/80">
                        {eq.status === "active" ? `${metrics.pf.toFixed(2)} / ${metrics.freq.toFixed(1)}Hz` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">ENERGY TODAY</p>
                      <p className="font-bold tabular-nums text-emerald-500">
                        {metrics.energyKwh.toFixed(1)} <span className="font-sans font-normal text-muted-foreground text-[8px]">kWh</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">MAX DEMAND</p>
                      <p className="font-bold tabular-nums text-[var(--accent-cyan)]">
                        {peakKw.toFixed(1)} <span className="font-sans font-normal text-muted-foreground text-[8px]">kW</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
