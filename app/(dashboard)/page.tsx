import { getDashboardData } from "@/lib/data/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const { meters, alerts, settings, last24hReport, todayEnergyKwh, demandComparison, monthlyPeaks } =
    await getDashboardData();

  return (
    <DashboardOverview
      initialMeters={meters}
      initialAlerts={alerts}
      settings={settings}
      last24h={{ totalConsumptionKwh: last24hReport.totalConsumptionKwh, totalCost: last24hReport.totalCost }}
      todayEnergyKwh={todayEnergyKwh}
      demandComparison={demandComparison}
      monthlyPeaks={monthlyPeaks}
    />
  );
}