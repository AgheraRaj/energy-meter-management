"use client";

import { cn } from "@/lib/utils";

export type StatusLevel = "normal" | "alarm" | "alert" | "offline" | "maintenance";

interface StatusPillProps {
  status: StatusLevel;
  className?: string;
  size?: "sm" | "md";
}

const config: Record<StatusLevel, { label: string; dotClass: string; pillClass: string }> = {
  normal:      { label: "NORMAL",      dotClass: "bg-[var(--accent-green)]",  pillClass: "bg-[var(--accent-green)]/10  text-[var(--accent-green)]  border-[var(--accent-green)]/20"  },
  alarm:       { label: "ALARM",       dotClass: "bg-[var(--accent-amber)]",  pillClass: "bg-[var(--accent-amber)]/10  text-[var(--accent-amber)]  border-[var(--accent-amber)]/20"  },
  alert:       { label: "ALERT",       dotClass: "bg-[var(--accent-red)] animate-pulse",    pillClass: "bg-[var(--accent-red)]/10    text-[var(--accent-red)]    border-[var(--accent-red)]/20"    },
  offline:     { label: "OFFLINE",     dotClass: "bg-muted-foreground",       pillClass: "bg-muted/40                  text-muted-foreground        border-border"                     },
  maintenance: { label: "MAINT",       dotClass: "bg-[var(--accent-amber)]",  pillClass: "bg-[var(--accent-amber)]/10  text-[var(--accent-amber)]  border-[var(--accent-amber)]/20"  },
};

export function StatusPill({ status, className, size = "md" }: StatusPillProps) {
  const c = config[status] ?? config.offline;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-display font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]",
        c.pillClass,
        className
      )}
    >
      <span className={cn("rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", c.dotClass)} />
      {c.label}
    </span>
  );
}
