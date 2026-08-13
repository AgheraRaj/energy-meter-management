"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Network, Cpu, Gauge, Bell,
  SlidersHorizontal, FileText, Zap
} from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { AlertWithMeter } from "@/lib/types";

interface SidebarNavProps {
  initialAlerts?: AlertWithMeter[];
}

const navItems = [
  { href: "/",          label: "Dashboard",          icon: LayoutDashboard },
  { href: "/sld",       label: "Single Line Diagram", icon: Network         },
  { href: "/equipment", label: "Equipment List",      icon: Cpu             },
  { href: "/meters",    label: "Energy Meters",       icon: Gauge           },
  { href: "/alerts",    label: "Alarms",              icon: Bell,  alarm: true },
  { href: "/settings",  label: "Setpoints & Alerts",  icon: SlidersHorizontal },
  { href: "/reports",   label: "Reports",             icon: FileText        },
];

export function SidebarNav({ initialAlerts = [] }: SidebarNavProps) {
  const pathname = usePathname();
  const { alerts } = useLiveData({ initialAlerts });
  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {navItems.map(({ href, label, icon: Icon, alarm }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
            <span className="flex-1">{label}</span>
            {alarm && unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-red)] px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}