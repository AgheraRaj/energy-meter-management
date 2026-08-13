import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MeterWithReading } from "@/lib/types";

interface MeterDemandCardsProps {
  meters: MeterWithReading[];
  monthlyPeaks: Record<number, number>;
}

function severity(pct: number) {
  if (pct >= 96) return { label: "Alert", border: "border-t-[var(--accent-red)]", badge: "bg-[var(--accent-red)]/15 text-[var(--accent-red)]" };
  if (pct >= 87) return { label: "Alarm", border: "border-t-[var(--accent-amber)]", badge: "bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]" };
  return { label: "Normal", border: "border-t-[var(--accent-green)]", badge: "bg-[var(--accent-green)]/15 text-[var(--accent-green)]" };
}

export function MeterDemandCards({ meters, monthlyPeaks }: MeterDemandCardsProps) {
  if (meters.length === 0) {
    return <p className="text-sm text-muted-foreground">No meters have thresholds configured yet</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {meters.map((meter) => {
        const power = meter.latestReading?.powerKw ?? 0;
        const max = meter.maxPowerKw ?? 1;
        const pct = (power / max) * 100;
        const sev = severity(pct);
        const peak = monthlyPeaks[meter.id] ?? power;

        return (
          <div key={meter.id} className={cn("rounded-lg border border-t-2 bg-card p-4", sev.border)}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[13px]">
                {meter.name} <span className="text-muted-foreground">({meter.location || "—"})</span>
              </span>
              <Badge className={sev.badge}>{sev.label}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display text-[9.5px] text-muted-foreground">Current Demand</p>
                <p className="font-mono-ems text-base font-semibold text-[var(--accent-cyan)]">
                  {power.toFixed(0)} <span className="text-[9.5px] text-muted-foreground">kW</span>
                </p>
              </div>
              <div>
                <p className="font-display text-[9.5px] text-muted-foreground">Loading</p>
                <p className="font-mono-ems text-base font-semibold text-[var(--accent-cyan)]">
                  {pct.toFixed(1)}<span className="text-[9.5px] text-muted-foreground">%</span>
                </p>
              </div>
              <div>
                <p className="font-display text-[9.5px] text-muted-foreground">Max Demand (Month)</p>
                <p className="font-mono-ems text-base font-semibold text-[var(--accent-cyan)]">
                  {peak.toFixed(0)} <span className="text-[9.5px] text-muted-foreground">kW</span>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}