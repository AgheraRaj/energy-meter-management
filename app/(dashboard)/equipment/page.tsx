import { getMeters } from "@/lib/data/meters";
import { EquipmentList } from "@/components/dashboard/equipment-list";

export const metadata = {
  title: "Equipment List - EMS",
  description: "Live electrical parameters for downstream equipment loads",
};

export default async function EquipmentPage() {
  const meters = await getMeters("equipment");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Equipment List</h1>
        <p className="text-sm text-muted-foreground">
          Live monitoring of downstream equipment parameters and alarm status.
        </p>
      </div>

      <EquipmentList initialMeters={meters} />
    </div>
  );
}
