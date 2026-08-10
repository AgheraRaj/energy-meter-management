"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

export function PowerOverview() {
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
        <CardTitle>Live Power Consumption</CardTitle>
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
            Loading trend...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No meter data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} unit=" kW" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="totalPowerKw"
                name="Total load"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}