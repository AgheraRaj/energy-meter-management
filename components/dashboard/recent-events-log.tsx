import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertWithMeter } from "@/lib/types";

const borderColor: Record<string, string> = {
  critical: "border-l-[var(--accent-red)]",
  warning: "border-l-[var(--accent-amber)]",
};

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function RecentEventsLog({ alerts }: { alerts: AlertWithMeter[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-[13px] text-muted-foreground">Recent Alarms &amp; Events</CardTitle>
        <span className="text-xs text-muted-foreground">{alerts.length} events</span>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
            {alerts.map((a) => (
              <div key={a.id} className={cn("flex items-start gap-3 rounded-md border-l-3 bg-muted/40 px-3 py-2 text-xs", borderColor[a.severity])}>
                <span className="whitespace-nowrap font-mono-ems text-muted-foreground">{timeStr(a.createdAt)}</span>
                <span>
                  <b className="font-medium text-foreground">{a.meter.name}</b> — {a.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}