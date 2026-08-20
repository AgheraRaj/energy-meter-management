// app/(dashboard)/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { getMeters } from "@/lib/data/meters";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = {
  title: "Settings - EMS",
  description: "Manage plant demand setpoints and equipment alarm thresholds",
};

export default async function SettingsPage() {
  const [settings, equipmentMeters, transformerMeters] = await Promise.all([
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        ratePerKwh: 8.5,
        alarmSetpointKw: 1400.0,
        alertSetpointKw: 1450.0,
      },
    }),
    getMeters("equipment"),
    getMeters("transformer"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Setpoints & Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Configure plant demand limits, per-transformer loading setpoints, and per-equipment threshold notifications.
        </p>
      </div>

      <SettingsForm
        initialSettings={{ ...settings, billingCycleAnchorDate: settings.billingCycleAnchorDate?.toISOString() ?? null }}
        initialMeters={equipmentMeters}
        initialTransformers={transformerMeters}
      />
    </div>
  );
}