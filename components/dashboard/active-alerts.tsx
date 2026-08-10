import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { alertSeverityStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { AlertWithMeter } from "@/lib/types";

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ActiveAlertsProps {
  alerts: AlertWithMeter[];
  onAcknowledge: (id: number) => void;
}

export function ActiveAlerts({ alerts, onAcknowledge }: ActiveAlertsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Alerts</CardTitle>
        <Link href="/alerts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("uppercase", alertSeverityStyles[alert.severity])}>{alert.severity}</Badge>
                  <span className="text-sm font-medium">{alert.meter.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(alert.createdAt)}</p>
              </div>
              {!alert.acknowledged && (
                <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
                  Acknowledge
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}