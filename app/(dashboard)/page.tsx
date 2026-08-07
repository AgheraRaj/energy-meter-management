import { getMeters } from "@/lib/data/meters";
import { MeterCard } from "@/components/dashboard/meter-card";

export default async function DashboardPage() {
  const meters = await getMeters();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Meters overview</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meters.map((meter) => (
          <MeterCard key={meter.id} meter={meter} />
        ))}
      </div>
    </div>
  );
}