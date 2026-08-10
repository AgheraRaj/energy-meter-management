// components/dashboard/electrical-parameters.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reading } from "@/lib/types";

export function ElectricalParameters({ reading }: { reading: Reading | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Electrical Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        {!reading ? (
          <p className="text-sm text-muted-foreground">No reading data available</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Param label="Voltage" value={`${reading.voltage} V`} />
            <Param label="Current" value={`${reading.current} A`} />
            <Param label="Active Power" value={`${reading.powerKw} kW`} />
          </div>
        )}
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          Reactive power, apparent power, power factor, frequency, and phase-wise (R/Y/B) readings
          aren&apos;t shown — this meter&apos;s data source doesn&apos;t currently capture them.
        </p>
      </CardContent>
    </Card>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}