"use client";

import { useMemo, useState } from "react";
import { useLiveData } from "@/hooks/use-live-data";
import { AlertWithMeter } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

interface AlertsListProps {
  initialAlerts: AlertWithMeter[];
}

type TabType = "all" | "alert" | "alarm" | "normal";

export function AlertsList({ initialAlerts }: AlertsListProps) {
  const { alerts, setAlerts, connected } = useLiveData({ initialAlerts });
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const acknowledge = async (id: number) => {
    // Optimistic update
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge");
    } catch (err) {
      console.error(err);
      // Revert if error
      setAlerts(initialAlerts);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab === "all") return true;
      if (activeTab === "alert") return a.severity === "critical";
      if (activeTab === "alarm") return a.severity === "warning";
      if (activeTab === "normal") return a.severity === "normal" || a.acknowledged;
      return true;
    });
  }, [alerts, activeTab]);

  return (
    <Card className="border bg-card">
      <CardContent className="pt-6 space-y-4">
        {/* Controls / Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 border rounded-lg p-0.5 bg-background">
            {(["all", "alert", "alarm", "normal"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-display font-bold tracking-wider rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {tab === "normal" ? "Normal-Cleared" : tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-ems">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`} />
            {connected ? "Live Stream" : "Reconnecting..."}
          </div>
        </div>

        {/* Alarms Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Time</TableHead>
                <TableHead className="w-[120px]">Level</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[100px]">State</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No alarms found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => {
                  const date = new Date(alert.createdAt);
                  const timeStr = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  });
                  const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <TableRow key={alert.id} className={alert.acknowledged ? "opacity-60" : ""}>
                      <TableCell className="font-mono-ems text-xs">
                        <div>{timeStr}</div>
                        <div className="text-[10px] text-muted-foreground">{dateStr}</div>
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          status={
                            alert.severity === "critical"
                              ? "alert"
                              : alert.severity === "warning"
                              ? "alarm"
                              : "normal"
                          }
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground mr-1.5">
                          {alert.meter?.name || "System"}:
                        </span>
                        <span className="text-muted-foreground text-xs font-mono-ems">{alert.message}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-bold ${alert.acknowledged ? "text-muted-foreground" : "text-[var(--accent-red)] animate-pulse"}`}>
                          {alert.acknowledged ? "Cleared" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.acknowledged && alert.severity !== "normal" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] font-display font-semibold"
                            onClick={() => acknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}