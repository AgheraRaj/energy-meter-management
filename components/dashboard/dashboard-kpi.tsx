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
  accentClassName?: string;
}

export function DashboardKpi({
  label,
  value,
  icon: Icon,
  sublabel,
  breakdown,
  href,
  accentClassName,
}: DashboardKpiProps) {
  const content = (
    <Card className={cn("h-full transition-colors", href && "cursor-pointer hover:ring-foreground/20")}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
          <Icon className={cn("h-4 w-4 text-muted-foreground", accentClassName)} />
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        {breakdown && (
          <div className="flex gap-3 pt-1 text-xs">
            {breakdown.map((b) => (
              <span key={b.label} className={cn("font-medium", b.className)}>
                {b.value} <span className="font-normal text-muted-foreground">{b.label}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}