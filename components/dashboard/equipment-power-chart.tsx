"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeterWithReading } from "@/lib/types";

function barColor(meter: MeterWithReading) {
  const power = meter.latestReading?.powerKw ?? 0;
  if (meter.maxPowerKw) {
    const pct = (power / meter.maxPowerKw) * 100;
    if (pct >= 96) return "var(--accent-red)";
    if (pct >= 87) return "var(--accent-amber)";
  }
  return "var(--accent-green)";
}

export function EquipmentPowerChart({ meters }: { meters: MeterWithReading[] }) {
  const data = meters
    .filter((m) => m.latestReading)
    .map((m) => ({ name: m.name, kw: m.latestReading!.powerKw, color: barColor(m) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-[13px] text-muted-foreground">Equipment-wise Power Consumption</CardTitle>
        <p className="text-xs text-muted-foreground">Actual kW · live</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No meter data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} unit=" kW" />
              <Tooltip formatter={(value: any, name: any, props: any) => [value ? `${value} kW` : "N/A", "Power"]} />
              <Bar dataKey="kw" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}