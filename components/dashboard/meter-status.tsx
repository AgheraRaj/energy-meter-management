import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meterStatusStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { MeterWithReading } from "@/lib/types";

interface MeterStatusPanelProps {
  active: number;
  offline: number;
  maintenance: number;
  offlineOrMaintenance: MeterWithReading[];
}

export function MeterStatusPanel({ active, offline, maintenance, offlineOrMaintenance }: MeterStatusPanelProps) {
  const rows = [
    { label: "Active", value: active, dot: "bg-emerald-400" },
    { label: "Offline", value: offline, dot: "bg-red-400" },
    { label: "Maintenance", value: maintenance, dot: "bg-amber-400" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meter Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                {row.label}
              </span>
              <span className="font-medium tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>

        {offlineOrMaintenance.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            {offlineOrMaintenance.map((meter) => (
              <Link
                key={meter.id}
                href={`/meters/${meter.id}`}
                className="flex items-center justify-between rounded-md p-1.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span>{meter.name}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-xs capitalize", meterStatusStyles[meter.status])}>
                  {meter.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}