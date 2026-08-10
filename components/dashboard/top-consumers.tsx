import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { meterStatusStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { MeterWithReading } from "@/lib/types";

export function TopConsumers({ meters }: { meters: MeterWithReading[] }) {
  const maxPower = Math.max(...meters.map((m) => m.latestReading?.powerKw ?? 0), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Power Consumers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meter data available</p>
        ) : (
          meters.map((meter, index) => {
            const power = meter.latestReading?.powerKw ?? 0;
            const widthPct = Math.max((power / maxPower) * 100, 4);

            return (
              <Link
                key={meter.id}
                href={`/meters/${meter.id}`}
                className="block rounded-md p-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs font-medium text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-medium">{meter.name}</p>
                      <p className="text-xs text-muted-foreground">{meter.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{power.toFixed(1)} kW</span>
                    <Badge className={cn("capitalize", meterStatusStyles[meter.status])}>{meter.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}