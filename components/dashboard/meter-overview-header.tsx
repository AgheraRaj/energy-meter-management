// components/dashboard/meter-overview-header.tsx
import { Badge } from "@/components/ui/badge";
import { meterStatusStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { Meter } from "@/lib/types";

interface MeterOverviewHeaderProps {
  meter: Meter;
  lastCommunication: string | null;
  /** True while status === "active" AND a reading has arrived within the
   * live-data timeout. Passed in rather than computed here so the caller's
   * ticking clock (which must re-run even without new socket events) drives
   * this — see hooks/use-now.ts. */
  isLive: boolean;
}

export function MeterOverviewHeader({ meter, lastCommunication, isLive }: MeterOverviewHeaderProps) {
  // DB-set offline/maintenance always wins; otherwise "active" only reads
  // as Online while data is actually still arriving.
  const displayStatus: "active" | "offline" | "maintenance" =
    meter.status === "active" ? (isLive ? "active" : "offline") : meter.status;
  const label = displayStatus === "active" ? "online" : displayStatus;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{meter.name}</h2>
          <Badge className={cn("capitalize", meterStatusStyles[displayStatus])}>
            {label}
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