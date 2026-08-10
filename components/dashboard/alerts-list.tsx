"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertWithMeter {
  id: number;
  meterId: number;
  meter: { name: string };
  message: string;
  severity: "warning" | "critical";
  acknowledged: boolean;
  createdAt: string;
}

const severityStyles: Record<string, string> = {
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export function AlertsList({ initialAlerts }: { initialAlerts: AlertWithMeter[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);

  useEffect(() => {
    const socket = io();

    socket.on("alert:new", (alert: AlertWithMeter) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function acknowledge(id: number) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground">No alerts.</p>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className={cn(alert.acknowledged && "opacity-60")}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={severityStyles[alert.severity]}>{alert.severity}</Badge>
                <span className="text-sm font-medium">{alert.meter.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
            {!alert.acknowledged && (
              <Button size="sm" variant="outline" onClick={() => acknowledge(alert.id)}>
                Acknowledge
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}