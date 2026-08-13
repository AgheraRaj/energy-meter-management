"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AlertWithMeter } from "@/lib/types";
import { X, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  alert: AlertWithMeter;
}

export function ToastNotifications() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const socket = io();

    socket.on("alert:new", (alert: AlertWithMeter) => {
      const id = `${alert.id}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, alert }]);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(({ id, alert }) => {
        const isCritical = alert.severity === "critical";
        const isWarning = alert.severity === "warning";
        const isNormal = alert.severity === "normal";

        return (
          <div
            key={id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-top-2",
              isCritical
                ? "bg-[#121821] border-[var(--accent-red)] text-[var(--accent-red)]"
                : isWarning
                ? "bg-[#121821] border-[var(--accent-amber)] text-[var(--accent-amber)]"
                : "bg-[#121821] border-[var(--accent-green)] text-[var(--accent-green)]"
            )}
          >
            {isCritical && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            {isWarning && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
            {isNormal && <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[10px] font-bold tracking-widest uppercase opacity-90">
                  {alert.severity === "normal" ? "Normal / Cleared" : alert.severity}
                </span>
                <button
                  onClick={() => removeToast(id)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/10 rounded p-0.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-foreground font-semibold mt-1">
                {alert.meter?.name || "System"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alert.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
