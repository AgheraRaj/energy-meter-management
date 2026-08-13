import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKpiProps {
  label: string;
  value: string;
  icon: LucideIcon;
  sublabel?: string;
  breakdown?: { label: string; value: string; className?: string }[];
  href?: string;
  tone?: "default" | "amber" | "red";
}

const toneBorder: Record<string, string> = {
  default: "border-t-border",
  amber: "border-t-[var(--accent-amber)]",
  red: "border-t-[var(--accent-red)]",
};

const toneValue: Record<string, string> = {
  default: "text-foreground",
  amber: "text-[var(--accent-amber)]",
  red: "text-[var(--accent-red)]",
};

export function DashboardKpi({ label, value, icon: Icon, sublabel, breakdown, href, tone = "default" }: DashboardKpiProps) {
  const content = (
    <Card className={cn("h-full border-t-2 transition-colors", toneBorder[tone], href && "cursor-pointer hover:ring-foreground/20")}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-[11px] text-muted-foreground">{label}</span>
          <Icon className={cn("h-4 w-4", tone === "default" ? "text-muted-foreground" : toneValue[tone])} />
        </div>
        <span className={cn("font-mono-ems text-2xl font-semibold", toneValue[tone])}>{value}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        {breakdown && (
          <div className="flex gap-3 pt-1 text-xs">
            {breakdown.map((b) => (
              <span key={b.label} className={cn("font-mono-ems font-medium", b.className)}>
                {b.value} <span className="font-sans font-normal text-muted-foreground">{b.label}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}