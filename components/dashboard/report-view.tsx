"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, RefreshCw } from "lucide-react";
import { ReportResult } from "@/lib/reports";
import { AlertWithMeter } from "@/lib/types";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

interface MonthlyAggregate {
  id: number;
  code: string;
  name: string;
  type: "transformer" | "equipment";
  status: "active" | "offline" | "maintenance";
  ratedKw: number;
  bus: string;
  feederCode: string;
  currentVoltage: number;
  currentCurrent: number;
  currentPowerKw: number;
  currentKva: number;
  currentPf: number;
  loadPct: number;
  monthlyConsumptionKwh: number;
  peakDemandKw: number;
}

export function ReportView() {
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // MTD aggregates
  const [monthlyData, setMonthlyData] = useState<MonthlyAggregate[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    fetchMonthlyData();
  }, []);

  async function fetchMonthlyData() {
    setMonthlyLoading(true);
    try {
      const res = await fetch("/api/reports/monthly");
      if (res.ok) {
        const data = await res.json();
        setMonthlyData(data);
      }
    } catch (e) {
      console.error("Failed to fetch MTD aggregates:", e);
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function runReport() {
    setLoading(true);
    setError(null);

    if (!from || !to) {
      setReport(null);
      setError("Please select both from and to dates.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report failed");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  // Generates a single Excel workbook (.xlsx) with only the equipment-detail sheet.
  async function downloadExcel() {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "VoltIQ";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Equipment Detail");
      sheet.columns = [
        { header: "Equipment Name", key: "name", width: 25 },
        { header: "Start Reading (kWh)", key: "start", width: 20 },
        { header: "End Reading (kWh)", key: "end", width: 20 },
        { header: "Consumption (kWh)", key: "consumption", width: 20 },
        { header: "Voltage (V)", key: "voltage", width: 14 },
        { header: "Current (A)", key: "current", width: 14 },
        { header: "Power (kW)", key: "powerKw", width: 14 },
        { header: "kVA", key: "kva", width: 14 },
        { header: "PF", key: "pf", width: 12 },
        { header: "Frequency (Hz)", key: "frequency", width: 16 },
        { header: "THD (%)", key: "thd", width: 14 },
        { header: "Load %", key: "loadPct", width: 12 },
        { header: "Billing Cost (Rs.)", key: "cost", width: 18 },
      ];

      if (report) {
        report.rows.forEach((r) => {
          sheet.addRow({
            name: r.meterName,
            start: r.startKwh,
            end: r.endKwh,
            consumption: r.consumptionKwh,
            voltage: r.voltage,
            current: r.current,
            powerKw: r.powerKw,
            kva: r.apparentPowerKva,
            pf: r.powerFactor,
            frequency: r.frequencyHz,
            thd: r.thd,
            loadPct: r.loadPercent,
            cost: r.cost,
          });
        });

        sheet.addRow({
          name: "Total",
          start: "",
          end: "",
          consumption: report.totalConsumptionKwh,
          voltage: "",
          current: "",
          powerKw: "",
          kva: "",
          pf: "",
          frequency: "",
          thd: "",
          loadPct: "",
          cost: report.totalCost,
        });
      }

      // Write and download buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voltiq-energy-report-${from}-to-${to}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Excel generation error:", e);
    }
  }

  function downloadPDF() {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Energy Consumption Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${from} to ${to}`, 14, 26);
    doc.text(`Rate: Rs. ${report.ratePerKwh} / kWh`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Meter", "Start (kWh)", "End (kWh)", "Consumption (kWh)", "Voltage (V)", "Current (A)", "Power (kW)", "kVA", "PF", "Frequency (Hz)", "THD (%)", "Load %", "Cost"]],
      body: report.rows.map((r) => [
        r.meterName,
        r.startKwh.toFixed(3),
        r.endKwh.toFixed(3),
        r.consumptionKwh.toFixed(3),
        r.voltage.toFixed(1),
        r.current.toFixed(2),
        r.powerKw.toFixed(2),
        r.apparentPowerKva.toFixed(2),
        r.powerFactor.toFixed(3),
        r.frequencyHz.toFixed(2),
        r.thd.toFixed(2),
        r.loadPercent.toFixed(1),
        `Rs. ${r.cost.toFixed(2)}`,
      ]),
      foot: [["Total", "", "", report.totalConsumptionKwh.toFixed(3), "", "", "", "", "", "", "", "", `Rs. ${report.totalCost.toFixed(2)}`]],
    });

    doc.save(`voltiq-energy-report-${from}-to-${to}.pdf`);
  }

  const transformers = monthlyData.filter((m) => m.type === "transformer");
  const equipment = monthlyData.filter((m) => m.type === "equipment");

  return (
    <div className="space-y-6">
      {/* Date Select Panel */}
      <Card className="border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-[13px] text-muted-foreground">SELECT CONSUMPTION PERIOD</CardTitle>
          <CardDescription>Generate audit reports for custom intervals</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs text-muted-foreground">From Date</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs text-muted-foreground">To Date</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          </div>
          <Button onClick={runReport} disabled={loading} className="h-9 px-4 text-xs font-display font-semibold">
            {loading ? "Generating..." : "Generate report"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive font-semibold">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Consumption Report panel */}
      {report && (
        <Card className="border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-display text-[13px] text-muted-foreground">CONSUMPTION REPORT</CardTitle>
              <CardDescription>
                Summary for {from} to {to} at Rs. {report.ratePerKwh}/kWh
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadExcel} className="h-8 text-xs font-display font-semibold">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Excel (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF} className="h-8 text-xs font-display font-semibold">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {report.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No consumption logs found.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meter Name</TableHead>
                        <TableHead className="text-right">Start (kWh)</TableHead>
                        <TableHead className="text-right">End (kWh)</TableHead>
                        <TableHead className="text-right">Consumption (kWh)</TableHead>
                        <TableHead className="text-right">Voltage (V)</TableHead>
                        <TableHead className="text-right">Current (A)</TableHead>
                        <TableHead className="text-right">Power (kW)</TableHead>
                        <TableHead className="text-right">kVA</TableHead>
                        <TableHead className="text-right">PF</TableHead>
                        <TableHead className="text-right">Frequency (Hz)</TableHead>
                        <TableHead className="text-right">THD (%)</TableHead>
                        <TableHead className="text-right">Load %</TableHead>
                        <TableHead className="text-right">Estimated Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.map((row) => (
                        <TableRow key={row.meterId}>
                          <TableCell className="font-semibold">{row.meterName}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.startKwh.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.endKwh.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums font-semibold text-[var(--accent-cyan)]">
                            {row.consumptionKwh.toFixed(1)} kWh
                          </TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.voltage.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.current.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.powerKw.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.apparentPowerKva.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.powerFactor.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.frequencyHz.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.thd.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{row.loadPercent.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-emerald-500 font-semibold">
                            Rs. {row.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell>Total Combined</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right font-mono-ems text-[var(--accent-cyan)]">
                          {report.totalConsumptionKwh.toFixed(1)} kWh
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right font-mono-ems text-emerald-500">
                          Rs. {report.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MONTH-TO-DATE SECTIONS */}
      <div className="space-y-6">
        {/* Table 1: Transformers */}
        <Card className="border bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-[13px] text-muted-foreground">MONTHLY CONSUMPTION & PEAK DEMAND — TRANSFORMERS</CardTitle>
              <CardDescription>Current billing month-to-date aggregates</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchMonthlyData} disabled={monthlyLoading}>
              <RefreshCw className={`h-4 w-4 ${monthlyLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Transformer</TableHead>
                    <TableHead className="text-right">Rated (kVA)</TableHead>
                    <TableHead className="text-right">Current Loading (kVA)</TableHead>
                    <TableHead className="text-right">Loading %</TableHead>
                    <TableHead className="text-right">HT Voltage (kV)</TableHead>
                    <TableHead className="text-right">HT Current (A)</TableHead>
                    <TableHead className="text-right">Monthly Consumption (kWh)</TableHead>
                    <TableHead className="text-right">Peak Demand of Month (kVA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transformers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        No transformer aggregates available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transformers.map((tr) => {
                      const htVoltage = tr.currentVoltage * (11000 / 415);
                      const htKva = tr.currentKva / 0.985;
                      const htCurrent = htVoltage > 0 ? (htKva * 1000) / (Math.sqrt(3) * htVoltage) : 0;
                      const peakKva = tr.peakDemandKw * 1.015;

                      return (
                        <TableRow key={tr.id}>
                          <TableCell className="font-semibold">{tr.name}</TableCell>
                          <TableCell className="text-right font-mono-ems">{tr.ratedKw}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-foreground/80">{tr.currentKva.toFixed(0)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{tr.loadPct.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">{(htVoltage / 1000).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">{htCurrent.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums font-semibold text-emerald-500">
                            {tr.monthlyConsumptionKwh.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums font-bold text-[var(--accent-cyan)]">
                            {peakKva.toFixed(0)}
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

        {/* Table 2: Equipment */}
        <Card className="border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-[13px] text-muted-foreground">MONTHLY CONSUMPTION & PEAK DEMAND — EQUIPMENT</CardTitle>
            <CardDescription>MTD metrics for downstream active loads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rated (kW)</TableHead>
                    <TableHead className="text-right">Actual (kW)</TableHead>
                    <TableHead className="text-right">kVA</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">Load %</TableHead>
                    <TableHead className="text-right">Monthly Consumption (kWh)</TableHead>
                    <TableHead className="text-right">Peak Demand of Month (kW)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        No equipment aggregates available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipment.map((eq) => {
                      // Status color
                      const metrics = getEquipmentStatus(eq);

                      return (
                        <TableRow key={eq.id}>
                          <TableCell className="font-semibold">{eq.name}</TableCell>
                          <TableCell className="capitalize text-xs text-muted-foreground">{eq.type}</TableCell>
                          <TableCell className="text-right font-mono-ems">{eq.ratedKw}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-foreground/80">{eq.currentPowerKw.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">{eq.currentKva.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">{eq.currentPf.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums">{eq.loadPct.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums font-semibold text-emerald-500">
                            {eq.monthlyConsumptionKwh.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right font-mono-ems tabular-nums font-bold text-[var(--accent-cyan)]">
                            {eq.peakDemandKw.toFixed(1)}
                          </TableCell>
                          <TableCell>
                            <StatusPill status={metrics.alarmStatus} size="sm" />
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
      </div>
    </div>
  );

  // Helper for status badge inside table
  function getEquipmentStatus(m: MonthlyAggregate) {
    const power = m.currentPowerKw;
    const rated = m.ratedKw;
    const maxLimit = rated * 0.9;
    let alarmStatus: StatusLevel = "normal";
    
    if (m.status === "offline") alarmStatus = "offline";
    else if (m.status === "maintenance") alarmStatus = "maintenance";
    else if (power >= maxLimit) {
      if (power >= rated * 0.98) alarmStatus = "alert";
      else alarmStatus = "alarm";
    }
    return { alarmStatus };
  }
}