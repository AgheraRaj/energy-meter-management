import { prisma } from "@/lib/prisma";
import { AlertsList } from "@/components/dashboard/alerts-list";

export const metadata = {
  title: "Alarms & Events - VoltIQ",
  description: "Plant live warning logs, alerts, andCleared event registry",
};

export default async function AlertsPage() {
  const alerts = await prisma.alert.findMany({
    include: { meter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serializedAlerts = alerts.map((alert) => ({
    ...alert,
    createdAt: alert.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Alarms & Events</h1>
        <p className="text-sm text-muted-foreground">
          Live feed of threshold breaches, notifications dispatched, and cleared logs.
        </p>
      </div>
      <AlertsList initialAlerts={serializedAlerts} />
    </div>
  );
}