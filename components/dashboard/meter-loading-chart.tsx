"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeterWithReading } from "@/lib/types";

export function MeterLoadingChart({ meters }: { meters: MeterWithReading[] }) {
  const data = meters
    .filter((m) => m.maxPowerKw !== null)
    .map((m) => ({ name: m.name, current: m.latestReading?.powerKw ?? 0, max: m.maxPowerKw ?? 0 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-[13px] text-muted-foreground">Meter Loading</CardTitle>
        <p className="text-xs text-muted-foreground">kW vs configured max threshold</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No meters have thresholds configured
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit=" kW" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="current" name="Current (kW)" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="max" name="Max (kW)" fill="var(--muted)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}