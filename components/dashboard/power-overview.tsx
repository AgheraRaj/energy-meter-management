"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RANGES = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
] as const;

type Range = (typeof RANGES)[number]["value"];

interface TrendPoint {
  time: string;
  totalPowerKw: number;
}

interface PowerOverviewProps {
  alarmKw?: number;
  alertKw?: number;
}

export function PowerOverview({ alarmKw, alertKw }: PowerOverviewProps) {
  const [range, setRange] = useState<Range>("24h");
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/power-trend?range=${range}`)
      .then((res) => res.json())
      .then((data: TrendPoint[]) => setPoints(data))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = points.map((p) => ({
    time: new Date(p.time).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: range === "24h" ? "2-digit" : undefined,
    }),
    totalPowerKw: p.totalPowerKw,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-[13px] text-muted-foreground">Live Power Consumption</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
              className="font-mono-ems"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Loading trend...</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No meter data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fontFamily: "var(--font-mono-ems)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono-ems)" }} unit=" kW" />
              <Tooltip contentStyle={{ fontFamily: "var(--font-mono-ems)", fontSize: 12 }} />
              {alarmKw && (
                <ReferenceLine y={alarmKw} stroke="var(--accent-amber)" strokeDasharray="5 4" strokeWidth={1.5} />
              )}
              {alertKw && (
                <ReferenceLine y={alertKw} stroke="var(--accent-red)" strokeDasharray="5 4" strokeWidth={1.5} />
              )}
              <Line type="monotone" dataKey="totalPowerKw" name="Total load" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}