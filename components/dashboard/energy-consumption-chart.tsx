// components/dashboard/energy-consumption-chart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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