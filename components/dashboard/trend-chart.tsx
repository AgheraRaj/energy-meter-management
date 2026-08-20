// components/dashboard/trend-chart.tsx — full rewrite
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Reading } from "@/lib/types";

const RANGES = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

type Range = (typeof RANGES)[number]["value"];

export function TrendChart({ meterId }: { meterId: number }) {
  const [range, setRange] = useState<Range>("24h");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/meters/${meterId}/readings?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: Reading[]) => setReadings(data))
      .catch(() => setError("Failed to load readings. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [meterId, range]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    powerKw: r.powerKw,
  }));

  // Cap displayed ticks to ~6 regardless of range, instead of one tick per raw sample.
  const tickInterval = Math.max(Math.ceil(chartData.length / 6), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Power trend</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Loading readings...
          </div>
        ) : error ? (
          <div className="flex h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={fetchReadings}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No readings in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} interval={tickInterval} />
              <YAxis tick={{ fontSize: 12 }} unit=" kW" />
              <Tooltip
                formatter={((value: any) => [`${value ?? 0} kW`, "Power"]) as any}
                labelFormatter={(label: any) => String(label)}
              />
              {/* var(--primary) directly — hsl(var(--primary)) is invalid since
                  --primary is stored as a full oklch() color, not raw HSL components. */}
              <Line type="monotone" dataKey="powerKw" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

type MeterTrendRange = "today" | "monthly" | "yearly" | "custom";
type CustomRange = { from: string; to: string };

const METER_TREND_RANGES: { value: MeterTrendRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Date & Time" },
];

function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ChartStatus({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[250px] items-center justify-center text-center text-sm text-muted-foreground">{children}</div>;
}

export function MeterTrendCharts({ meterId }: { meterId: number }) {
  const initialNow = new Date();
  const initialToday = new Date(initialNow);
  initialToday.setHours(0, 0, 0, 0);
  const [range, setRange] = useState<MeterTrendRange>("today");
  const [startInput, setStartInput] = useState(localDateTimeValue(initialToday));
  const [endInput, setEndInput] = useState(localDateTimeValue(initialNow));
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestUrl = useMemo(() => {
    if (range === "custom") {
      if (!customRange) return null;
      return `/api/meters/${meterId}/readings?range=custom&from=${encodeURIComponent(customRange.from)}&to=${encodeURIComponent(customRange.to)}`;
    }
    return `/api/meters/${meterId}/readings?range=${range}`;
  }, [customRange, meterId, range]);

  const loadReadings = useCallback(async (url: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load readings.");
      setReadings(payload);
    } catch (reason) {
      if ((reason as Error).name !== "AbortError") {
        setError(reason instanceof Error ? reason.message : "Failed to load readings.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!requestUrl) {
      return;
    }
    const controller = new AbortController();
    loadReadings(requestUrl, controller.signal);
    return () => controller.abort();
  }, [loadReadings, requestUrl]);

  useEffect(() => {
    if (range !== "today") return;
    const socket: Socket = io();
    socket.on("reading:new", (reading: Reading) => {
      if (reading.meterId !== meterId) return;
      setReadings((previous) => {
        if (reading.id && previous.some((item) => item.id === reading.id)) return previous;
        return [...previous, reading]
          .sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt))
          .slice(-720);
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [meterId, range]);

  const chartData = readings.map((reading) => ({
    ...reading,
    label: new Date(reading.recordedAt).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  }));
  const tickInterval = Math.max(Math.ceil(chartData.length / 6), 1);
  const pendingCustom = range === "custom" && !customRange;

  const applyCustomRange = () => {
    const from = new Date(startInput);
    const to = new Date(endInput);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      setError("Start date/time must be earlier than or equal to end date/time.");
      return;
    }
    setCustomRange({ from: from.toISOString(), to: to.toISOString() });
    setError(null);
  };

  const charts: { title: string; key: "powerKw" | "voltage" | "current"; unit: string; color: string }[] = [
    { title: "Power Trend", key: "powerKw", unit: "kW", color: "var(--accent-cyan)" },
    { title: "Voltage Trend", key: "voltage", unit: "V", color: "var(--accent-amber)" },
    { title: "Current Trend", key: "current", unit: "A", color: "var(--accent-green)" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {METER_TREND_RANGES.map((option) => (
            <Button key={option.value} size="sm" variant={range === option.value ? "default" : "outline"} onClick={() => {
              setRange(option.value);
              if (option.value === "custom") {
                setCustomRange(null);
                setReadings([]);
              }
            }}>
              {option.label}
            </Button>
          ))}
        </div>
        {range === "today" && <span className="text-xs text-[var(--accent-green)]">Live updates enabled</span>}
      </div>

      {range === "custom" && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="mb-1 block text-xs text-muted-foreground">Start date & time</label><Input type="datetime-local" value={startInput} onChange={(event) => setStartInput(event.target.value)} /></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">End date & time</label><Input type="datetime-local" value={endInput} onChange={(event) => setEndInput(event.target.value)} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={applyCustomRange}><CalendarDays className="mr-2 h-4 w-4" />Fetch Data</Button></div>
          {error && <p className="text-xs text-[var(--accent-red)] sm:col-span-2 lg:col-span-3">{error}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {charts.map((chart) => (
          <Card key={chart.key}>
            <CardHeader className="pb-2"><CardTitle className="font-display text-xs text-muted-foreground">{chart.title}</CardTitle></CardHeader>
            <CardContent>
              {loading ? <ChartStatus>Loading readings...</ChartStatus>
                : error ? <ChartStatus>{error}</ChartStatus>
                : pendingCustom ? <ChartStatus>Select a date/time range, then choose Fetch Data.</ChartStatus>
                : chartData.length === 0 ? <ChartStatus>No readings in this range.</ChartStatus>
                : <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} interval={tickInterval} />
                    <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} unit={` ${chart.unit}`} />
                    <Tooltip
                      labelFormatter={(_, payload) => payload[0]?.payload.recordedAt ? new Date(payload[0].payload.recordedAt).toLocaleString() : ""}
                      formatter={((value: number) => [`${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${chart.unit}`, chart.title]) as any}
                    />
                    <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
