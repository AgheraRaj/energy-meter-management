// app/(dashboard)/page.tsx
import { getDashboardData } from "@/lib/data/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage(props: { searchParams: Promise<{ filter?: string }> }) {
  const searchParams = await props.searchParams;
  const filter = (searchParams.filter === "billing" ? "billing" : "today") as "today" | "billing";
  const data = await getDashboardData(filter);
  return (
    <DashboardOverview
      initialMeters={data.meters}
      initialAlerts={data.alerts}
      settings={{ ratePerKwh: data.settings.ratePerKwh }}
      last24h={{ totalConsumptionKwh: data.last24hReport.totalConsumptionKwh, totalCost: data.last24hReport.totalCost }}
      periodEnergyKwh={data.periodEnergyKwh}
      peakPlantDemandKva={data.peakPlantDemandKva}
      monthlyPeaks={data.monthlyPeaks}
      overageSummary={data.overageSummary}
      billingCycle={data.billingCycle ?? null}
      filter={data.filter}
    />
  );
}
