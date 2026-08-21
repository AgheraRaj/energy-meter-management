"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertWithMeter } from "@/lib/types";

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertWithMeter[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data: AlertWithMeter[]) => setAlerts(data.slice(0, 12)));

    const socket = io();

    socket.on("alert:new", (alert: AlertWithMeter) => {
      setAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev].slice(0, 12)));
    });

    socket.on("alert:acknowledged", ({ id }: { id: number }) => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unread = alerts.filter((a) => !a.acknowledged).length;

  const filteredAlerts = useMemo(() => {
    if (!search.trim()) return alerts;
    const searchTerm = search.toLowerCase();
    return alerts.filter((a) => a.meter.name.toLowerCase().includes(searchTerm) || a.message.toLowerCase().includes(searchTerm));
  }, [alerts, search]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen((o) => !o);
          if (open) setSearch("");
        }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-red)] px-1 font-mono-ems text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
      {open && (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border bg-popover shadow-lg">
          <Command className="border-none" shouldFilter={false}>
            <CommandInput placeholder="Search notifications..." value={search} onValueChange={setSearch} className="border-none" />
            <CommandList className="max-h-80 py-2">
              <CommandEmpty>No notifications found.</CommandEmpty>
              {filteredAlerts.map((a) => (
                <CommandItem
                  key={a.id}
                  value={String(a.id)}
                  className="cursor-pointer gap-2 px-4 py-2"
                  onSelect={() => {
                    setOpen(false);
                    setSearch("");
                    window.location.href = "/alerts";
                  }}
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-medium text-sm">{a.meter.name}</span>
                    <span className="text-xs text-muted-foreground">{a.message}</span>
                  </div>
                  {!a.acknowledged && <div className="h-2 w-2 rounded-full bg-[var(--accent-red)]" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
          <Link href="/alerts" onClick={() => setOpen(false)} className="block border-t px-4 py-2 text-center text-xs text-[var(--accent-cyan)] hover:underline">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}