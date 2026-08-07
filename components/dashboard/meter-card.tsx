import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeterWithReading } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<MeterWithReading["status"], string> = {
  active: "bg-green-100 text-green-700",
  offline: "bg-red-100 text-red-700",
  maintenance: "bg-amber-100 text-amber-700",
};

export function MeterCard({ meter }: { meter: MeterWithReading }) {
  const { latestReading } = meter;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{meter.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{meter.location}</p>
        </div>
        <Badge className={cn("capitalize", statusStyles[meter.status])}>
          {meter.status}
        </Badge>
      </CardHeader>
      <CardContent>
        {latestReading ? (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <Stat label="Power" value={`${latestReading.powerKw} kW`} />
            <Stat label="Voltage" value={`${latestReading.voltage} V`} />
            <Stat label="Current" value={`${latestReading.current} A`} />
          </div>
        ) : (
          <p className="pt-2 text-sm text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}