import { getMeters } from "@/lib/data/meters";
import { prisma } from "@/lib/prisma";
import { MetersGrid } from "@/components/dashboard/meters-grid";

export const metadata = {
  title: "Energy Meters - VoltIQ",
  description: "Transformer and equipment meters overview",
};

export default async function MetersPage() {
  const meters = await getMeters();

  // Retrieve monthly peak load in kW for each meter
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const peaks = await prisma.reading.groupBy({
    by: ["meterId"],
    where: { recordedAt: { gte: startOfMonth } },
    _max: { powerKw: true },
  });

  const monthlyPeaks: Record<number, number> = {};
  peaks.forEach((p) => {
    monthlyPeaks[p.meterId] = p._max.powerKw ?? 0;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Energy Meters</h1>
        <p className="text-sm text-muted-foreground">
          Detailed incoming transformer utility supplies and downstream equipment loading parameters.
        </p>
      </div>

      <MetersGrid initialMeters={meters} monthlyPeaks={monthlyPeaks} />
    </div>
  );
}