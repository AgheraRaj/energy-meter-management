import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { prisma } from "@/lib/prisma";
import { getMeters } from "@/lib/data/meters";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [allMeters, settings] = await Promise.all([
    getMeters(),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const transformerCount = allMeters.filter((m) => m.type === "transformer").length;
  const meterCount = allMeters.filter((m) => m.type === "equipment").length;
  const safeSettings = settings ?? { alarmSetpointKw: 1400, alertSetpointKw: 1450 };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          initialMeters={allMeters}
          settings={safeSettings}
          transformerCount={transformerCount}
          meterCount={meterCount}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}