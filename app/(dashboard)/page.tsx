import { getMeters } from "@/lib/data/meters";
import { LiveDashboard } from "@/components/dashboard/live-dashboard";

export default async function DashboardPage() {
  const meters = await getMeters();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Meters overview</h2>
      <LiveDashboard initialMeters={meters} />
    </div>
  );
}