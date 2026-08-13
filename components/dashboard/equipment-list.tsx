"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search } from "lucide-react";
import { MeterWithReading, Reading } from "@/lib/types";
import { useLiveData } from "@/hooks/use-live-data";
import { StatusPill, StatusLevel } from "@/components/ui/status-pill";

interface EquipmentListProps {
  initialMeters: MeterWithReading[];
}

type SortField = "name" | "ratedKw" | "powerKw" | "loadPct" | "energyKwh";
type SortOrder = "asc" | "desc";

export function EquipmentList({ initialMeters }: EquipmentListProps) {
  const router = useRouter();
  const { meters, connected } = useLiveData({ initialMeters });
  const [search, setSearch] = useState("");
  const [busFilter, setBusFilter] = useState<"all" | "BUS-1" | "BUS-2">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "offline" | "maintenance">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Handle sorting trigger
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // default desc for numeric sorting
    }
  };

  // Helper: compute metrics (kVA, PF, load %, simulated Freq since Freq is not in schema)
  const computedMeters = useMemo(() => {
    return meters.map((m) => {
      const latest = m.latestReading;
      const voltage = latest?.voltage ?? 415;
      const current = latest?.current ?? 0;
      const powerKw = latest?.powerKw ?? 0;
      const energyKwh = latest?.energyKwh ?? 0;
      const thd = latest?.thd ?? null;

      // 3-Phase Apparent Power Formula: S = sqrt(3) * V * I / 1000
      const kva = (Math.sqrt(3) * voltage * current) / 1000;
      // Power Factor: PF = P / S
      const pf = kva > 0 ? Math.min(1.0, powerKw / kva) : 0.9;
      
      const rated = m.ratedKw ?? 100;
      const loadPct = rated > 0 ? (powerKw / rated) * 100 : 0;

      // Simulated Freq (not stored in schema, 50Hz baseline with slight variation)
      const seedHash = m.id * 13;
      const freq = 50.0 + ((seedHash % 7) - 3) * 0.02 + (connected ? (Math.random() - 0.5) * 0.04 : 0);

      // Status Level
      const maxLimit = m.maxPowerKw ?? rated * 0.9;
      let alarmStatus: StatusLevel = "normal";
      
      if (m.status === "offline") alarmStatus = "offline";
      else if (m.status === "maintenance") alarmStatus = "maintenance";
      else if (powerKw >= maxLimit) {
        if (powerKw >= rated * 0.98) alarmStatus = "alert";
        else alarmStatus = "alarm";
      }

      return {
        ...m,
        computed: {
          voltage,
          current,
          powerKw,
          energyKwh,
          kva,
          pf,
          loadPct,
          freq,
          thd,
          alarmStatus,
        },
      };
    });
  }, [meters, connected]);

  // Filter and sort meters
  const filteredAndSortedMeters = useMemo(() => {
    return computedMeters
      .filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.code && m.code.toLowerCase().includes(search.toLowerCase())) ||
          (m.feederCode && m.feederCode.toLowerCase().includes(search.toLowerCase()));
        
        const matchesBus = busFilter === "all" || m.bus === busFilter;
        
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && m.status === "active") ||
          (statusFilter === "offline" && m.status === "offline") ||
          (statusFilter === "maintenance" && m.status === "maintenance");

        return matchesSearch && matchesBus && matchesStatus;
      })
      .sort((a, b) => {
        let fieldA: any = a[sortField as keyof typeof a];
        let fieldB: any = b[sortField as keyof typeof b];

        // Access nested computed fields
        if (sortField === "powerKw" || sortField === "loadPct" || sortField === "energyKwh") {
          fieldA = a.computed[sortField];
          fieldB = b.computed[sortField];
        }

        if (fieldA === null || fieldA === undefined) return 1;
        if (fieldB === null || fieldB === undefined) return -1;

        if (typeof fieldA === "string") {
          return sortOrder === "asc"
            ? fieldA.localeCompare(fieldB)
            : fieldB.localeCompare(fieldA);
        }

        return sortOrder === "asc" ? fieldA - fieldB : fieldB - fieldA;
      });
  }, [computedMeters, search, busFilter, statusFilter, sortField, sortOrder]);

  return (
    <Card className="border bg-card">
      <CardContent className="pt-6 space-y-4">
        {/* Controls Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 min-w-[240px] items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment, feeder..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select
              className="h-9 px-3 border rounded-md text-sm bg-background text-foreground"
              value={busFilter}
              onChange={(e: any) => setBusFilter(e.target.value)}
            >
              <option value="all">All Buses</option>
              <option value="BUS-1">Bus-1 (BUS-1)</option>
              <option value="BUS-2">Bus-2 (BUS-2)</option>
            </select>

            <select
              className="h-9 px-3 border rounded-md text-sm bg-background text-foreground"
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-ems">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground animate-pulse"}`} />
            {connected ? "Live Update" : "Reconnecting..."}
          </div>
        </div>

        {/* Table container */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="h-8 -ml-3">
                    Equipment <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Feeder</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("ratedKw")} className="h-8 -mr-3">
                    Rated (kW) <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Voltage (V)</TableHead>
                <TableHead className="text-right">Current (A)</TableHead>
                <TableHead className="text-right">Freq (Hz)</TableHead>
                <TableHead className="text-right">PF</TableHead>
                <TableHead className="text-right">THD (%)</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("powerKw")} className="h-8 -mr-3">
                    Power (kW) <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">kVA</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("loadPct")} className="h-8 -mr-3">
                    Load % <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("energyKwh")} className="h-8 -mr-3">
                    Energy Today <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Notify Above (kW)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedMeters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center text-muted-foreground py-10">
                    No matching equipment found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedMeters.map((meter) => {
                  const comp = meter.computed;
                  const rated = meter.ratedKw ?? 100;
                  const power = comp.powerKw;

                  return (
                    <TableRow
                      key={meter.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(`/meters/${meter.id}`)}
                    >
                      <TableCell className="font-semibold">
                        <div>{meter.name}</div>
                        <span className="text-[10px] text-muted-foreground font-mono-ems block">
                          {meter.code}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">
                        {meter.type}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono-ems text-xs font-semibold">
                          {meter.feederCode || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono-ems text-xs">
                          {meter.bus || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums">{rated}</TableCell>
                      
                      {/* Live electrical properties */}
                      <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">
                        {meter.status === "active" ? comp.voltage.toFixed(0) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">
                        {meter.status === "active" ? comp.current.toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-[10px] text-muted-foreground">
                        {meter.status === "active" ? comp.freq.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">
                        {meter.status === "active" ? comp.pf.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-[10px] text-muted-foreground">
                        {meter.status === "active" && comp.thd !== null ? `${comp.thd.toFixed(1)}%` : "—"}
                      </TableCell>
                      
                      {/* Power parameters */}
                      <TableCell className="text-right font-mono-ems tabular-nums font-bold text-[var(--accent-cyan)]">
                        {meter.status === "active" ? `${power.toFixed(1)} kW` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-muted-foreground">
                        {meter.status === "active" ? `${comp.kva.toFixed(1)}` : "—"}
                      </TableCell>
                      
                      {/* Load & Energy today */}
                      <TableCell className="text-right font-mono-ems tabular-nums font-semibold">
                        {meter.status === "active" ? `${comp.loadPct.toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono-ems tabular-nums text-[12px] font-semibold text-emerald-500">
                        {comp.energyKwh.toFixed(1)} <span className="text-[9px] text-muted-foreground font-normal">kWh</span>
                      </TableCell>

                      <TableCell className="text-right font-mono-ems tabular-nums font-medium text-muted-foreground">
                        {meter.maxPowerKw ? `${meter.maxPowerKw.toFixed(0)} kW` : "—"}
                      </TableCell>
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StatusPill status={comp.alarmStatus} size="sm" />
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
  );
}
