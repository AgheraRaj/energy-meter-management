import { prisma } from "@/lib/prisma";
import { AlertsList } from "@/components/dashboard/alerts-list";

export default async function AlertsPage() {
  const alerts = await prisma.alert.findMany({
    include: { meter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serializedAlerts = alerts.map((alert) => ({
    ...alert,
    createdAt: alert.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Alerts</h2>
      <AlertsList initialAlerts={serializedAlerts} />
    </div>
  );
}