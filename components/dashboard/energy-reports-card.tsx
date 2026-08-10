import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EnergyReportsCard({ ratePerKwh }: { ratePerKwh: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Reports</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Generate a consumption and cost report for any date range.</p>
          <p className="mt-1 text-sm font-medium">Rate: ₹{ratePerKwh} / kWh</p>
        </div>
        <Link href="/reports" className={cn(buttonVariants({ variant: "default" }))}>
          Generate Report
        </Link>
      </CardContent>
    </Card>
  );
}