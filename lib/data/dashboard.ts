import { prisma } from "@/lib/prisma";
import { getMeters } from "@/lib/data/meters";
import { generateReport } from "@/lib/reports";

export async function getDashboardData() {
  const [meters, alertRows, settings, last24hReport] = await Promise.all([
    getMeters(),
    prisma.alert.findMany({
      include: { meter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ratePerKwh: 8.5 } }),
    generateReport(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
  ]);

  const alerts = alertRows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));

  return { meters, alerts, settings, last24hReport };
}