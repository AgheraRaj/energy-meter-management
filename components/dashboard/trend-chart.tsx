// components/dashboard/trend-chart.tsx — full rewrite
"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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