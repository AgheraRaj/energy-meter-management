import { MeterWithReading } from "@/lib/types";
import { StatusLevel } from "@/components/ui/status-pill";

const HT_TRANSFORMER_LOSS_FACTOR = 0.985; // ~1.5% loss reflected on the HT side
const HT_VOLTAGE_RATIO = 11000 / 415;

export interface TransformerElectricals {
  kva: number;
  pf: number;
  voltage: number;
  current: number;
  powerKw: number;
  htVoltage: number;
  htKva: number;
  htCurrent: number;
}

export function getTransformerElectricals(meter: Pick<MeterWithReading, "latestReading">): TransformerElectricals {
  const reading = meter.latestReading;
  if (!reading) {
    return { kva: 0, pf: 0.9, voltage: 415, current: 0, powerKw: 0, htVoltage: 11000, htKva: 0, htCurrent: 0 };
  }

  const { voltage, current, powerKw } = reading;
  const kva = (Math.sqrt(3) * voltage * current) / 1000;
  const pf = kva > 0 ? Math.min(1.0, powerKw / kva) : 0.9;
  const htVoltage = voltage * HT_VOLTAGE_RATIO;
  const htKva = kva / HT_TRANSFORMER_LOSS_FACTOR;
  const htCurrent = htVoltage > 0 ? (htKva * 1000) / (Math.sqrt(3) * htVoltage) : 0;

  return { kva, pf, voltage, current, powerKw, htVoltage, htKva, htCurrent };
}

/**
 * A transformer's status is driven ONLY by its own alarmSetpointKva /
 * alertSetpointKva — never by a percentage of its rated capacity, and never
 * by any other transformer's reading or setpoint. This is the single place
 * that decision is made; every view (dashboard cards, gauges, SLD, meters
 * grid) must call this rather than re-deriving its own thresholds, which is
 * exactly how the amber-badge bug happened — three separate components each
 * invented their own hardcoded 80%/95%-of-rated logic that ignored the
 * setpoints an operator actually configured in Setpoints & Alerts.
 *
 * No setpoints configured for a transformer = "not being monitored", so it
 * always reads as normal rather than falling back to some assumed threshold.
 */
export function getTransformerStatus(
  meter: Pick<MeterWithReading, "alarmSetpointKva" | "alertSetpointKva">,
  kva: number
): StatusLevel {
  const { alarmSetpointKva, alertSetpointKva } = meter;
  if (alarmSetpointKva == null && alertSetpointKva == null) return "normal";

  if (alertSetpointKva != null && kva >= alertSetpointKva) return "alert";
  if (alarmSetpointKva != null && kva >= alarmSetpointKva) return "alarm";
  return "normal";
}