// lib/format.ts
// Single source of truth for how kVA / kW / kWh values are displayed
// (axis ticks, tooltips, KPI cards) so formatting stays consistent
// everywhere instead of every chart rolling its own toFixed/toLocaleString.

export function formatKva(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString("en-IN")} kVA`;
}

export function formatKw(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`;
}

export function formatKwh(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
}

export function formatVoltage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} V`;
}

export function formatCurrent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} A`;
}

// Compact variants for axis ticks, where full precision (esp. for kW/kWh)
// would crowd the axis — whole numbers with thousands separators only.
export function formatAxisNumber(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}