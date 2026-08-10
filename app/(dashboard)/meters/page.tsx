import { prisma } from "@/lib/prisma";
import { MetersTable } from "@/components/dashboard/meters-table";
import { serializeMeter } from "@/lib/data/meters";

export default async function MetersPage() {
  const meters = await prisma.meter.findMany({
    include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const formatted = meters.map(serializeMeter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Meters</h2>
      </div>
      <MetersTable initialMeters={formatted} />
    </div>
  );
}