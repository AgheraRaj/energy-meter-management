import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeterWithReading } from "@/lib/types";

export function EnergyDistribution({ meters }: { meters: MeterWithReading[] }) {
  const withEnergy = meters
    .filter((m) => m.latestReading)
    .map((m) => ({ name: m.name, energyKwh: m.latestReading!.energyKwh }))
    .sort((a, b) => b.energyKwh - a.energyKwh);

  const total = withEnergy.reduce((sum, m) => sum + m.energyKwh, 0);
  const top = withEnergy.slice(0, 4);
  const othersTotal = withEnergy.slice(4).reduce((sum, m) => sum + m.energyKwh, 0);
  const rows = othersTotal > 0 ? [...top, { name: "Others", energyKwh: othersTotal }] : top;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy by Meter</CardTitle>
        <p className="text-xs text-muted-foreground">Based on latest recorded energy</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meter data available</p>
        ) : (
          rows.map((row) => {
            const pct = total > 0 ? (row.energyKwh / total) * 100 : 0;
            return (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}