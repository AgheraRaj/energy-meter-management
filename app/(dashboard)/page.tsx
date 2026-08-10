import { getDashboardData } from "@/lib/data/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const { meters, alerts, settings, last24hReport } = await getDashboardData();

  return (
    <DashboardOverview
      initialMeters={meters}
      initialAlerts={alerts}
      ratePerKwh={settings.ratePerKwh}
      last24h={{
        totalConsumptionKwh: last24hReport.totalConsumptionKwh,
        totalCost: last24hReport.totalCost,
      }}
    />
  );
}