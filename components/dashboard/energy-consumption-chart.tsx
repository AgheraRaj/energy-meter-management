// components/dashboard/energy-consumption-chart.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Reading } from "@/lib/types";
import { formatKwh, formatAxisNumber } from "@/lib/format";

interface EnergyConsumptionChartProps {
  today: number | null;
  week: number | null;
  month: number | null;
}

export function EnergyConsumptionChart({ today, week, month }: EnergyConsumptionChartProps) {
  const data = [
    { period: "Today", kwh: today },
    { period: "This Week", kwh: week },
    { period: "This Month", kwh: month },
  ];

  const hasAnyData = data.some((d) => d.kwh !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Consumption</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyData ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No consumption data available for these periods
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.map((d) => ({ ...d, kwh: d.kwh ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" kWh" />
              <Tooltip formatter={((value: any) => [`${value ?? 0} kWh`, "Consumption"]) as any} />
              <Bar dataKey="kwh" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          {data.map((d) => (
            <span key={d.period}>
              {d.period}: {d.kwh !== null ? `${d.kwh} kWh` : "no data"}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type EnergyView = "today" | "7d";
type EnergyPoint = { time: string; kwh: number | null };

export function LiveEnergyConsumptionChart({ meterId }: { meterId: number }) {
  const [view, setView] = useState<EnergyView>("today");
  const [data, setData] = useState<EnergyPoint[]>([]);
  const baselineKwh = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnergy = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/meters/${meterId}/energy?view=${view}`, { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load energy consumption.");
      setData(payload.data);
      baselineKwh.current = payload.baselineKwh ?? 0;
    } catch (reason) {
      if ((reason as Error).name !== "AbortError") {
        setError(reason instanceof Error ? reason.message : "Failed to load energy consumption.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [meterId, view]);

  useEffect(() => {
    const controller = new AbortController();
    loadEnergy(controller.signal);
    return () => controller.abort();
  }, [loadEnergy]);

  useEffect(() => {
    if (view !== "today") return;
    const socket: Socket = io();
    socket.on("reading:new", (reading: Reading) => {
      if (reading.meterId !== meterId) return;
      setData((previous) => {
        if (previous.length === 0) {
          baselineKwh.current = reading.energyKwh;
          return [{ time: reading.recordedAt, kwh: 0 }];
        }
        const point = {
          time: reading.recordedAt,
          kwh: Number(Math.max(0, reading.energyKwh - baselineKwh.current).toFixed(3)),
        };
        const withoutDuplicate = previous.filter((item) => item.time !== point.time);
        return [...withoutDuplicate, point].sort((a, b) => +new Date(a.time) - +new Date(b.time));
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [meterId, view]);

  const chartData = useMemo(() => data.map((point) => ({
    ...point,
    label: new Date(point.time).toLocaleString(undefined, view === "today"
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  })), [data, view]);
  const tickInterval = Math.max(Math.ceil(chartData.length / 6), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Energy Consumption</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "today" ? "default" : "outline"} onClick={() => setView("today")}>Today</Button>
          <Button size="sm" variant={view === "7d" ? "default" : "outline"} onClick={() => setView("7d")}>Last 7 Days</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Loading energy consumption...</div>
        ) : error ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <p>{error}</p><Button size="sm" variant="outline" onClick={() => loadEnergy()}>Retry</Button>
          </div>
        ) : chartData.length === 0 || chartData.every((point) => point.kwh === null) ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No energy readings are available for this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {view === "today" ? (
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={tickInterval} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatAxisNumber}
                  width={56}
                  label={{ value: "kWh", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(_, payload) => payload[0]?.payload.time ? new Date(payload[0].payload.time).toLocaleString() : ""}
                  formatter={((value: number) => [formatKwh(Number(value)), "Energy consumed"]) as any}
                />
                <Line type="monotone" dataKey="kwh" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatAxisNumber}
                  width={56}
                  label={{ value: "kWh", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(_, payload) => payload[0]?.payload.time ? new Date(payload[0].payload.time).toLocaleDateString() : ""}
                  formatter={((value: number) => [formatKwh(Number(value)), "Energy consumed"]) as any}
                />
                <Bar dataKey="kwh" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}