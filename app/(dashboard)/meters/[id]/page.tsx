import { notFound } from "next/navigation";
import { getMeterDetail } from "@/lib/data/meter-detail";
import { MeterDetailView } from "@/components/dashboard/meter-detail-view";

export default async function MeterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMeterDetail(Number(id));

  if (!detail) notFound();

  return <MeterDetailView {...detail} />;
}