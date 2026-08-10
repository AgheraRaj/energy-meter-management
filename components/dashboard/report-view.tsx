"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { ReportResult } from "@/lib/reports";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export function ReportView() {
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reportRows = Array.isArray(report?.rows) ? report.rows : [];

  async function runReport() {
    setLoading(true);
    setError(null);

    if (!from || !to) {
      setReport(null);
      setError("Please select both from and to dates.");
      setLoading(false);
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      setReport(null);
      setError("Please select valid from and to dates.");
      setLoading(false);
      return;
    }

    if (fromDate > toDate) {
      setReport(null);
      setError("From date must be on or before To date.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const text = await res.text();

      if (!res.ok) {
        let errorText = text || `Report request failed with status ${res.status}`;
        try {
          const json = JSON.parse(text);
          if (json?.error) errorText = String(json.error);
        } catch {
          // non-JSON error body, keep raw text
        }
        throw new Error(errorText);
      }

      if (!text) {
        throw new Error("Report response was empty.");
      }

      const data: ReportResult = JSON.parse(text);
      setReport(data);
    } catch (error) {
      console.error("Report fetch failed:", error);
      setReport(null);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!report) return;

    const header = ["Meter", "Start (kWh)", "End (kWh)", "Consumption (kWh)", "Cost"];
    const rows = report.rows.map((r) => [
      r.meterName,
      r.startKwh.toFixed(3),
      r.endKwh.toFixed(3),
      r.consumptionKwh.toFixed(3),
      r.cost.toFixed(2),
    ]);
    rows.push(["Total", "", "", report.totalConsumptionKwh.toFixed(3), report.totalCost.toFixed(2)]);

    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `energy-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!report) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Energy Consumption Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${from} to ${to}`, 14, 26);
    doc.text(`Rate: Rs. ${report.ratePerKwh} / kWh`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Meter", "Start (kWh)", "End (kWh)", "Consumption (kWh)", "Cost"]],
      body: report.rows.map((r) => [
        r.meterName,
        r.startKwh.toFixed(3),
        r.endKwh.toFixed(3),
        r.consumptionKwh.toFixed(3),
        `Rs. ${r.cost.toFixed(2)}`,
      ]),
      foot: [["Total", "", "", report.totalConsumptionKwh.toFixed(3), `Rs. ${report.totalCost.toFixed(2)}`]],
    });

    doc.save(`energy-report-${from}-to-${to}.pdf`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select period</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={runReport} disabled={loading}>
            {loading ? "Generating..." : "Generate report"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Report: {from} to {to} (Rs. {report.ratePerKwh}/kWh)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : reportRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No readings found in this period.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meter</TableHead>
                      <TableHead>Start (kWh)</TableHead>
                      <TableHead>End (kWh)</TableHead>
                      <TableHead>Consumption (kWh)</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map((row) => (
                      <TableRow key={row.meterId}>
                        <TableCell>{row.meterName}</TableCell>
                        <TableCell>{row.startKwh.toFixed(3)}</TableCell>
                        <TableCell>{row.endKwh.toFixed(3)}</TableCell>
                        <TableCell>{row.consumptionKwh.toFixed(3)}</TableCell>
                        <TableCell>Rs. {row.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-end gap-8 border-t pt-4 text-sm font-medium">
                  <span>Total: {report?.totalConsumptionKwh ?? 0} kWh</span>
                  <span>Rs. {report?.totalCost ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}