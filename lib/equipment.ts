import { Meter } from "./generated/prisma/client";

export type EquipmentStatus = "normal" | "alarm" | "alert" | "offline" | "maintenance";

type EquipmentStatusMeter = Pick<Meter, "status" | "maxPowerKw" | "minPowerKw">;

// Single source of truth for equipment status color across the app (SLD, tables,
// reports, dashboards). Breaching the configured "Notify Above" threshold is
// Critical the moment it happens — it does not require also being near rated
// capacity. That extra gate was the actual bug: it silently downgraded a real
// threshold breach to "alarm" (amber) unless power also neared 98% of rated kW.
export function getEquipmentStatus(meter: EquipmentStatusMeter, powerKw: number): EquipmentStatus {
  if (meter.status === "offline") return "offline";
  if (meter.status === "maintenance") return "maintenance";
  if (meter.maxPowerKw != null && powerKw >= meter.maxPowerKw) return "alert";
  if (meter.minPowerKw != null && powerKw < meter.minPowerKw) return "alarm";
  return "normal";
}