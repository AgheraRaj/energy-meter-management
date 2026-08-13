"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertWithMeter } from "@/lib/types";

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertWithMeter[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data: AlertWithMeter[]) => setAlerts(data.slice(0, 12)));

    const socket = io();
    socket.on("alert:new", (alert: AlertWithMeter) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 12));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const unread = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-red)] px-1 font-mono-ems text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
      {open && (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border bg-popover p-2 shadow-lg">
          <p className="mb-2 px-1 font-display text-[10px] text-muted-foreground">Recent Notifications</p>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                  <span className="font-medium">{a.meter.name}</span> — {a.message}
                </div>
              ))
            )}
          </div>
          <Link href="/alerts" className="mt-2 block text-center text-xs text-[var(--accent-cyan)] hover:underline">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}