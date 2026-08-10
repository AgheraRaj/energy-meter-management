import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TrendChart } from "@/components/dashboard/trend-chart";

export default async function MeterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meter = await prisma.meter.findUnique({ where: { id: Number(id) } });

  if (!meter) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{meter.name}</h2>
        <p className="text-muted-foreground">{meter.location}</p>
      </div>
      <TrendChart meterId={meter.id} />
    </div>
  );
}