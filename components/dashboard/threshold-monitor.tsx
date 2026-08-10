import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MeterWithReading } from "@/lib/types";

function getThresholdStatus(meter: MeterWithReading) {
  const power = meter.latestReading?.powerKw;
  if (power === undefined) return { label: "No data", className: "bg-muted text-muted-foreground" };
  if (meter.maxPowerKw !== null && power > meter.maxPowerKw) {
    return { label: "Exceeded", className: "bg-red-500/15 text-red-400" };
  }
  if (meter.minPowerKw !== null && power < meter.minPowerKw) {
    return { label: "Below Min", className: "bg-amber-500/15 text-amber-400" };
  }
  return { label: "Normal", className: "bg-emerald-500/15 text-emerald-400" };
}

export function ThresholdMonitor({ meters }: { meters: MeterWithReading[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Threshold Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meters have thresholds configured</p>
        ) : (
          meters.map((meter) => {
            const status = getThresholdStatus(meter);
            return (
              <Link
                key={meter.id}
                href={`/meters/${meter.id}`}
                className="flex items-center justify-between rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{meter.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {meter.latestReading ? `${meter.latestReading.powerKw} kW` : "No reading"} · Min{" "}
                    {meter.minPowerKw ?? "—"} · Max {meter.maxPowerKw ?? "—"}
                  </p>
                </div>
                <Badge className={status.className}>{status.label}</Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}