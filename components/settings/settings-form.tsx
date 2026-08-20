"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { MeterWithReading, Reading } from "@/lib/types";
import { useLiveData } from "@/hooks/use-live-data";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";

function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

interface SettingsFormProps {
  initialSettings: {
    ratePerKwh: number;
    billingCycleAnchorDate: string | Date | null;
  };
  initialMeters: MeterWithReading[];
  initialTransformers: MeterWithReading[];
}

export function SettingsForm({
  initialSettings,
  initialMeters,
  initialTransformers,
}: SettingsFormProps) {
  const { meters, connected } = useLiveData({
    initialMeters: [...initialMeters, ...initialTransformers],
  });

  // Local input states for the plant setpoints
  const [ratePerKwh, setRatePerKwh] = useState(
    initialSettings.ratePerKwh.toString(),
  );
  // <input type="date"> needs "YYYY-MM-DD" — only the day-of-month actually
  // drives the recurring cycle (see lib/billing-cycle.ts), the rest of the
  // date is just "since when this billing arrangement started".
  const [billingCycleAnchorDate, setBillingCycleAnchorDate] = useState(
    initialSettings.billingCycleAnchorDate
      ? new Date(initialSettings.billingCycleAnchorDate).toISOString().slice(0, 10)
      : "",
  );

  // Local state for per-equipment threshold + nameplate rating inputs, mapped by meter ID
  const [thresholds, setThresholds] = useState<Record<number, string>>(
    initialMeters.reduce(
      (acc, m) => {
        acc[m.id] = (m.maxPowerKw ?? 0).toString();
        return acc;
      },
      {} as Record<number, string>,
    ),
  );
  const [equipmentRatedKw, setEquipmentRatedKw] = useState<Record<number, string>>(
    initialMeters.reduce(
      (acc, m) => {
        acc[m.id] = (m.ratedKw ?? "").toString();
        return acc;
      },
      {} as Record<number, string>,
    ),
  );

  // Local state for per-transformer alarm/alert kVA setpoints + rated kVA, mapped by meter ID
  const [transformerSetpoints, setTransformerSetpoints] = useState<
    Record<number, { alarm: string; alert: string }>
  >(
    initialTransformers.reduce(
      (acc, m) => {
        acc[m.id] = {
          alarm: (m.alarmSetpointKva ?? "").toString(),
          alert: (m.alertSetpointKva ?? "").toString(),
        };
        return acc;
      },
      {} as Record<number, { alarm: string; alert: string }>,
    ),
  );
  const [transformerRatedKva, setTransformerRatedKva] = useState<Record<number, string>>(
    initialTransformers.reduce(
      (acc, m) => {
        acc[m.id] = (m.ratedKw ?? "").toString();
        return acc;
      },
      {} as Record<number, string>,
    ),
  );

  // Success / loading indicator states
  const [savedSettings, setSavedSettings] = useState(false);
  const [savedThresholds, setSavedThresholds] = useState(false);
  const [savedTransformerSetpoints, setSavedTransformerSetpoints] =
    useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingTransformerSetpoints, setSavingTransformerSetpoints] =
    useState(false);

  // Save plant setpoints
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSavedSettings(false);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratePerKwh: parseFloat(ratePerKwh),
          billingCycleAnchorDate,
        }),
      });

      if (response.ok) {
        setSavedSettings(true);
        setTimeout(() => setSavedSettings(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSavingSettings(false);
    }
  }

  // Save per-equipment thresholds + rated capacity
  async function handleSaveThresholds() {
    setSavingThresholds(true);
    setSavedThresholds(false);

    const thresholdData = Object.keys(thresholds).map((id) => {
      const maxPowerKw = parseFloat(thresholds[Number(id)]);
      const ratedKw = parseFloat(equipmentRatedKw[Number(id)]);
      return {
        id: parseInt(id),
        ...(Number.isNaN(maxPowerKw) ? {} : { maxPowerKw }),
        ...(Number.isNaN(ratedKw) ? {} : { ratedKw }),
      };
    });

    try {
      const response = await fetch("/api/meters/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds: thresholdData }),
      });

      if (response.ok) {
        setSavedThresholds(true);
        setTimeout(() => setSavedThresholds(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save thresholds:", error);
    } finally {
      setSavingThresholds(false);
    }
  }

  // Reset thresholds to 90% of rated capacity — uses whatever's currently
  // typed in the Rated column (not yet saved) so editing Rated then
  // resetting behaves the way an admin would expect.
  function handleResetThresholds() {
    const updated: Record<number, string> = {};
    meters
      .filter((m) => m.type === "equipment")
      .forEach((m) => {
        const typedRated = parseFloat(equipmentRatedKw[m.id]);
        const rated = !Number.isNaN(typedRated) ? typedRated : m.ratedKw;
        updated[m.id] = rated ? Math.round(rated * 0.9).toString() : (m.maxPowerKw ?? 0).toString();
      });
    setThresholds(updated);
  }

  // Handle single equipment threshold input change
  function handleThresholdChange(id: number, val: string) {
    setThresholds((prev) => ({
      ...prev,
      [id]: val,
    }));
  }

  // Handle single equipment rated-capacity input change
  function handleEquipmentRatedChange(id: number, val: string) {
    setEquipmentRatedKw((prev) => ({
      ...prev,
      [id]: val,
    }));
  }

  // Save per-transformer alarm/alert kVA setpoints + rated kVA
  async function handleSaveTransformerSetpoints() {
    setSavingTransformerSetpoints(true);
    setSavedTransformerSetpoints(false);

    // Rated kVA is always sent when it's a valid number, independent of the
    // alarm/alert pair below — editing just the rating shouldn't require
    // also having alerting configured.
    //
    // Alarm/alert are still a matched pair: both filled = save both values;
    // both blank = explicitly turn alerting off (sent as null, since a
    // fresh transformer or one that was blanked out on purpose should
    // actually clear in the DB, not silently keep its old setpoints); if
    // only one of the two is filled, that's an ambiguous half-set state, so
    // leave whatever's already saved untouched rather than guess.
    const data = Object.keys(transformerSetpoints).map((idStr) => {
      const id = parseInt(idStr);
      const { alarm, alert } = transformerSetpoints[id];
      const ratedKva = parseFloat(transformerRatedKva[id]);
      const bothBlank = alarm === "" && alert === "";
      const bothFilled = alarm !== "" && alert !== "";

      return {
        id,
        ...(Number.isNaN(ratedKva) ? {} : { ratedKva }),
        ...(bothBlank
          ? { alarmSetpointKva: null, alertSetpointKva: null }
          : bothFilled
            ? { alarmSetpointKva: parseFloat(alarm), alertSetpointKva: parseFloat(alert) }
            : {}),
      };
    });

    try {
      const response = await fetch("/api/meters/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transformerSetpoints: data }),
      });

      if (response.ok) {
        setSavedTransformerSetpoints(true);
        setTimeout(() => setSavedTransformerSetpoints(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save transformer setpoints:", error);
    } finally {
      setSavingTransformerSetpoints(false);
    }
  }

  // Handle single transformer setpoint input change
  function handleTransformerSetpointChange(
    id: number,
    field: "alarm" | "alert",
    val: string,
  ) {
    setTransformerSetpoints((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }));
  }

  // Handle single transformer rated-capacity input change
  function handleTransformerRatedChange(id: number, val: string) {
    setTransformerRatedKva((prev) => ({
      ...prev,
      [id]: val,
    }));
  }

  // Determine status color helper for equipment
  function getEquipStatus(
    latestReading: Reading | null,
    maxPowerKw: number | null,
    ratedKw: number | null,
    status: string,
  ): StatusLevel {
    if (status === "offline") return "offline";
    if (status === "maintenance") return "maintenance";
    if (!latestReading || maxPowerKw === null) return "normal";
    const kw = latestReading.powerKw;
    if (kw >= maxPowerKw) {
      if (ratedKw && kw >= ratedKw * 0.98) return "alert";
      return "alarm";
    }
    return "normal";
  }

  const equipmentMeters = meters.filter((m) => m.type === "equipment");
  const transformerMeters = meters.filter((m) => m.type === "transformer");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Per-Transformer Loading Setpoints */}
      <Card className="lg:col-span-3 bg-card border">
        <CardHeader>
          <CardTitle className="font-display text-[13px] text-muted-foreground">
            PER-TRANSFORMER LOADING SETPOINTS
          </CardTitle>
          <CardDescription>
            Independent alarm/alert kVA levels per transformer. Leave both
            fields blank to skip alerting for that transformer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transformer</TableHead>
                  <TableHead className="w-28">Rated (kVA)</TableHead>
                  <TableHead className="w-32">Alarm (kVA)</TableHead>
                  <TableHead className="w-32">Alert (kVA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transformerMeters.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-6"
                    >
                      No transformer meters found in database.
                    </TableCell>
                  </TableRow>
                ) : (
                  transformerMeters.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">
                        <div>{tr.name}</div>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono-ems block">
                          {tr.code || "—"} · {tr.bus || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="w-28">
                        <Input
                          type="number"
                          className="h-8 font-mono-ems text-xs w-24 text-right"
                          value={transformerRatedKva[tr.id] ?? ""}
                          onChange={(e) => handleTransformerRatedChange(tr.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 font-mono-ems text-xs w-28 text-right"
                          placeholder="Off"
                          value={transformerSetpoints[tr.id]?.alarm ?? ""}
                          onChange={(e) =>
                            handleTransformerSetpointChange(
                              tr.id,
                              "alarm",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 font-mono-ems text-xs w-28 text-right"
                          placeholder="Off"
                          value={transformerSetpoints[tr.id]?.alert ?? ""}
                          onChange={(e) =>
                            handleTransformerSetpointChange(
                              tr.id,
                              "alert",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSaveTransformerSetpoints}
              disabled={
                savingTransformerSetpoints || transformerMeters.length === 0
              }
              className="h-9 text-xs font-display font-semibold"
            >
              {savingTransformerSetpoints
                ? "Saving..."
                : "Save Transformer Setpoints"}
            </Button>
            {savedTransformerSetpoints && (
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Plant Demand Setpoints */}
      <Card className="lg:col-span-1 h-fit bg-card border">
        <CardHeader>
          <CardTitle className="font-display text-[13px] text-muted-foreground">
            PLANT DEMAND SETTINGS
          </CardTitle>
          <CardDescription>
            Configure billing and plant capacity settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="ratePerKwh"
                className="text-xs text-muted-foreground"
              >
                Rate per kWh (Rs.)
              </Label>
              <Input
                id="ratePerKwh"
                type="number"
                step="0.01"
                value={ratePerKwh}
                onChange={(e) => setRatePerKwh(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="billingCycleAnchorDate"
                className="text-xs text-muted-foreground"
              >
                Billing Date
              </Label>
              <Input
                id="billingCycleAnchorDate"
                type="date"
                value={billingCycleAnchorDate}
                onChange={(e) => setBillingCycleAnchorDate(e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                {billingCycleAnchorDate
                  ? `Dashboard shows consumption from the ${ordinal(
                      new Date(billingCycleAnchorDate + "T00:00:00").getDate(),
                    )} of each month through the same day next month — like an EMI/statement cycle.`
                  : "Leave blank to report by calendar month instead."}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={savingSettings}
                className="w-full h-9 text-xs font-display font-semibold"
              >
                {savingSettings ? "Saving..." : "Save Setpoints"}
              </Button>
              {savedSettings && (
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Per-Equipment Notification Thresholds */}
      <Card className="lg:col-span-2 bg-card border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="font-display text-[13px] text-muted-foreground">
              PER-EQUIPMENT NOTIFICATION THRESHOLDS
            </CardTitle>
            <CardDescription>
              Modify alarm limits (Notify Above kW) for individual downstream
              equipment.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-ems">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`}
            />
            {connected ? "Live Update" : "Reconnecting..."}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="w-28">Rated (kW)</TableHead>
                  <TableHead className="text-right">Current (kW)</TableHead>
                  <TableHead className="w-32">Notify Above (kW)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentMeters.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      No equipment meters found in database.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipmentMeters.map((meter) => {
                    const currentKw = meter.latestReading?.powerKw ?? 0;
                    const maxKw = parseFloat(thresholds[meter.id] || "0");
                    const status = getEquipStatus(
                      meter.latestReading,
                      maxKw,
                      meter.ratedKw,
                      meter.status,
                    );

                    return (
                      <TableRow key={meter.id}>
                        <TableCell className="font-medium">
                          <div>{meter.name}</div>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono-ems block">
                            {meter.feederCode || "—"} · {meter.bus || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="w-28">
                          <Input
                            type="number"
                            className="h-8 font-mono-ems text-xs w-24 text-right"
                            value={equipmentRatedKw[meter.id] ?? ""}
                            onChange={(e) => handleEquipmentRatedChange(meter.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono-ems tabular-nums font-semibold text-[var(--accent-cyan)]">
                          {meter.status === "active"
                            ? currentKw.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 font-mono-ems text-xs w-28 text-right"
                            value={thresholds[meter.id] || ""}
                            onChange={(e) =>
                              handleThresholdChange(meter.id, e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={status} size="sm" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handleSaveThresholds}
              disabled={savingThresholds || equipmentMeters.length === 0}
              className="h-9 text-xs font-display font-semibold"
            >
              {savingThresholds ? "Saving..." : "Save All Thresholds"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetThresholds}
              disabled={equipmentMeters.length === 0}
              className="flex items-center gap-1.5 text-xs h-9 font-display font-semibold"
            >
              <RefreshCw className="h-3 w-3" />
              Reset to 90% of Rated
            </Button>
            {savedThresholds && (
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="h-4 w-4" /> Saved Successfully
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}