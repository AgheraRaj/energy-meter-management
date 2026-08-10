"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { meterStatusStyles } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { MeterWithReading } from "@/lib/types";

export function LiveReadings({ meters }: { meters: MeterWithReading[] }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Meter Readings</CardTitle>
      </CardHeader>
      <CardContent>
        {meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meter data available</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Power</TableHead>
                    <TableHead>Voltage</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Energy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meters.map((meter) => (
                    <TableRow
                      key={meter.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/meters/${meter.id}`)}
                    >
                      <TableCell className="font-medium">{meter.name}</TableCell>
                      <TableCell>{meter.location || "—"}</TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", meterStatusStyles[meter.status])}>{meter.status}</Badge>
                      </TableCell>
                      <TableCell>{meter.latestReading ? `${meter.latestReading.powerKw} kW` : "—"}</TableCell>
                      <TableCell>{meter.latestReading ? `${meter.latestReading.voltage} V` : "—"}</TableCell>
                      <TableCell>{meter.latestReading ? `${meter.latestReading.current} A` : "—"}</TableCell>
                      <TableCell>
                        {meter.latestReading ? `${meter.latestReading.energyKwh.toLocaleString()} kWh` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 md:hidden">
              {meters.map((meter) => (
                <Link key={meter.id} href={`/meters/${meter.id}`} className="block rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{meter.name}</span>
                    <Badge className={cn("capitalize", meterStatusStyles[meter.status])}>{meter.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{meter.location}</p>
                  {meter.latestReading && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <span>{meter.latestReading.powerKw} kW</span>
                      <span>{meter.latestReading.voltage} V</span>
                      <span>{meter.latestReading.current} A</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}