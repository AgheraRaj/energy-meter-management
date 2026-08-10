// Shared color tokens for status/severity badges — opacity-based so they stay
// readable on both light and dark backgrounds without needing dark: variants.
export const meterStatusStyles: Record<"active" | "offline" | "maintenance", string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  offline: "bg-red-500/15 text-red-400",
  maintenance: "bg-amber-500/15 text-amber-400",
};

export const alertSeverityStyles: Record<"warning" | "critical", string> = {
  warning: "bg-amber-500/15 text-amber-400",
  critical: "bg-red-500/15 text-red-400",
};