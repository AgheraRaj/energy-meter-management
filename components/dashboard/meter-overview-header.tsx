// components/dashboard/meter-overview-header.tsx
import { Badge } from "@/components/ui/badge";
import { meterStatusStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { Meter } from "@/lib/types";

interface MeterOverviewHeaderProps {
  meter: Meter;
  lastCommunication: string | null;
}

export function MeterOverviewHeader({ meter, lastCommunication }: MeterOverviewHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{meter.name}</h2>
          <Badge className={cn("capitalize", meterStatusStyles[meter.status])}>
            {meter.status === "active" ? "online" : meter.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Meter #{meter.id} · {meter.location || "No location set"}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Last communication:{" "}
        {lastCommunication
          ? new Date(lastCommunication).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })
          : "No readings yet"}
      </p>
    </div>
  );
}