"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OverageSummaryRow } from "@/lib/data/overage";
import { Clock, TrendingUp } from "lucide-react";

function formatDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "0m";
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

// ─── Transformer Overage Table ────────────────────────────────────────────────
function TransformerOverageTable({
  rows,
  currency = "₹",
}: {
  rows: OverageSummaryRow[];
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-[13px] text-muted-foreground">
          TRANSFORMER OVERAGE &amp; DEMAND PENALTY
        </CardTitle>
        <CardDescription>
          Duration above alert kVA setpoint this month · accumulated excess kVAh · estimated demand penalty
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transformers with a configured alert setpoint.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transformer</TableHead>
                <TableHead className="text-right">Setpoint</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" /> Duration Above
                  </span>
                </TableHead>
                <TableHead className="text-right">Peak</TableHead>
                <TableHead className="text-right">Excess (kVAh)</TableHead>
                <TableHead className="text-right">Est. Penalty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const overLimit = row.peakValue - row.thresholdValue;
                return (
                  <TableRow
                    key={row.meterId}
                    className={
                      row.isCurrentlyOver
                        ? "bg-[var(--accent-red)]/5 border-l-2 border-l-[var(--accent-red)]"
                        : ""
                    }
                  >
                    <TableCell className="font-medium">
                      {row.meterName}
                      <span className="block text-[10px] text-muted-foreground font-mono uppercase">
                        {row.code ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.thresholdValue} kVA
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          row.totalOverageHours > 0
                            ? "font-semibold text-[var(--accent-red)]"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {row.totalOverageHours > 0 ? formatDuration(row.totalOverageHours) : "None"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.peakValue > 0 ? (
                        <span>
                          {row.peakValue} kVA
                          {overLimit > 0 && (
                            <span className="block text-[10px] text-[var(--accent-red)]">
                              +{overLimit.toFixed(1)} over
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.totalExcessUnitHours > 0 ? row.totalExcessUnitHours : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-[var(--accent-red)]">
                      {row.estimatedPenalty > 0 ? (
                        <>
                          {currency}
                          {row.estimatedPenalty.toLocaleString("en-IN")}
                        </>
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isCurrentlyOver ? (
                        <Badge className="bg-[var(--accent-red)]/15 text-[var(--accent-red)] text-[10px] animate-pulse">
                          Over now
                        </Badge>
                      ) : row.totalOverageHours > 0 ? (
                        <Badge className="bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] text-[10px]">
                          Had overage
                        </Badge>
                      ) : (
                        <Badge className="bg-[var(--accent-green)]/15 text-[var(--accent-green)] text-[10px]">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Equipment Billing Impact Table ──────────────────────────────────────────
function EquipmentBillingImpactTable({
  rows,
  currency = "₹",
}: {
  rows: OverageSummaryRow[];
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-[13px] text-muted-foreground">
          EQUIPMENT OVERAGE &amp; BILLING IMPACT
        </CardTitle>
        <CardDescription>
          Duration above notify threshold · excess kWh above setpoint · additional billing impact at energy rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No equipment with a configured threshold.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Setpoint</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" /> Duration Above
                  </span>
                </TableHead>
                <TableHead className="text-right">Peak</TableHead>
                <TableHead className="text-right">Excess (kWh)</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <TrendingUp className="h-3 w-3" /> Billing Impact
                  </span>
                </TableHead>
                <TableHead className="text-right">Penalty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const overLimit = row.peakValue - row.thresholdValue;
                return (
                  <TableRow
                    key={row.meterId}
                    className={
                      row.isCurrentlyOver
                        ? "bg-[var(--accent-amber)]/5 border-l-2 border-l-[var(--accent-amber)]"
                        : ""
                    }
                  >
                    <TableCell className="font-medium">
                      {row.meterName}
                      <span className="block text-[10px] text-muted-foreground font-mono uppercase">
                        {row.code ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.thresholdValue} kW
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          row.totalOverageHours > 0
                            ? "font-semibold text-[var(--accent-amber)]"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {row.totalOverageHours > 0 ? formatDuration(row.totalOverageHours) : "None"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.peakValue > 0 ? (
                        <span>
                          {row.peakValue} kW
                          {overLimit > 0 && (
                            <span className="block text-[10px] text-[var(--accent-amber)]">
                              +{overLimit.toFixed(1)} over
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.totalExcessUnitHours > 0 ? row.totalExcessUnitHours : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-[var(--accent-amber)]">
                      {row.additionalBillingImpact > 0 ? (
                        <>
                          {currency}
                          {row.additionalBillingImpact.toLocaleString("en-IN")}
                        </>
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs text-[var(--accent-red)]">
                      {row.estimatedPenalty > 0 ? (
                        <>
                          {currency}
                          {row.estimatedPenalty.toLocaleString("en-IN")}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isCurrentlyOver ? (
                        <Badge className="bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] text-[10px] animate-pulse">
                          Over now
                        </Badge>
                      ) : row.totalOverageHours > 0 ? (
                        <Badge className="bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] text-[10px]">
                          Had overage
                        </Badge>
                      ) : (
                        <Badge className="bg-[var(--accent-green)]/15 text-[var(--accent-green)] text-[10px]">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Summary KPI Strip ────────────────────────────────────────────────────────
function OverageSummaryStrip({
  transformers,
  equipment,
  currency = "₹",
}: {
  transformers: OverageSummaryRow[];
  equipment: OverageSummaryRow[];
  currency?: string;
}) {
  const totalTransformerPenalty = transformers.reduce((s, r) => s + r.estimatedPenalty, 0);
  const totalEquipmentImpact = equipment.reduce((s, r) => s + r.additionalBillingImpact, 0);
  const totalEquipmentPenalty = equipment.reduce((s, r) => s + r.estimatedPenalty, 0);
  const transformersOver = transformers.filter((r) => r.isCurrentlyOver).length;
  const equipmentOver = equipment.filter((r) => r.isCurrentlyOver).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">
          Transformers Over Limit
        </p>
        <p className="font-mono text-xl font-bold tabular-nums text-[var(--accent-red)]">
          {transformersOver}
          <span className="text-xs font-normal text-muted-foreground"> / {transformers.length}</span>
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">
          TR Demand Penalty (MTD)
        </p>
        <p className="font-mono text-xl font-bold tabular-nums text-[var(--accent-red)]">
          {currency}{totalTransformerPenalty.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">
          Equipment Over Limit
        </p>
        <p className="font-mono text-xl font-bold tabular-nums text-[var(--accent-amber)]">
          {equipmentOver}
          <span className="text-xs font-normal text-muted-foreground"> / {equipment.length}</span>
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">
          Equip. Billing Impact (MTD)
        </p>
        <p className="font-mono text-xl font-bold tabular-nums text-[var(--accent-amber)]">
          {currency}{totalEquipmentImpact.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          {totalEquipmentPenalty > 0 && (
            <span className="block text-[10px] font-normal text-[var(--accent-red)]">
              + {currency}{totalEquipmentPenalty.toLocaleString("en-IN")} penalty
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Public Panel ─────────────────────────────────────────────────────────────
interface OveragePenaltyPanelProps {
  transformers: OverageSummaryRow[];
  equipment: OverageSummaryRow[];
}

export function OveragePenaltyPanel({ transformers, equipment }: OveragePenaltyPanelProps) {
  return (
    <div className="space-y-4">
      <OverageSummaryStrip transformers={transformers} equipment={equipment} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TransformerOverageTable rows={transformers} />
        <EquipmentBillingImpactTable rows={equipment} />
      </div>
    </div>
  );
}