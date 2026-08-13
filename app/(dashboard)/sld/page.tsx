import { getTransformersWithChildren } from "@/lib/data/meters";
import { SldDiagram } from "@/components/dashboard/sld-diagram";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Single Line Diagram - VoltIQ",
  description: "Full plant electrical single line diagram",
};

export default async function SldPage() {
  const [transformers, settings] = await Promise.all([
    getTransformersWithChildren(),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const totalEquipment = transformers.reduce((s, t) => s + t.children.length, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Single Line Diagram</h1>
        <p className="text-sm text-muted-foreground">
          Full plant topology · {transformers.length} incomer transformer{transformers.length !== 1 ? "s" : ""} · {totalEquipment} monitored loads
        </p>
      </div>
      <SldDiagram
        initialTransformers={transformers}
        alarmSetpointKw={settings?.alarmSetpointKw ?? 1400}
        alertSetpointKw={settings?.alertSetpointKw ?? 1450}
      />
    </div>
  );
}
