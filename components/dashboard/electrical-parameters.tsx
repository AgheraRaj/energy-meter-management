// components/dashboard/electrical-parameters.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reading } from "@/lib/types";

const PHASES = [
  { label: "R", color: "var(--accent-red)", voltageKey: "voltageR", currentKey: "currentR", powerKey: "powerKwR" },
  { label: "Y", color: "var(--accent-amber)", voltageKey: "voltageY", currentKey: "currentY", powerKey: "powerKwY" },
  { label: "B", color: "var(--accent-cyan)", voltageKey: "voltageB", currentKey: "currentB", powerKey: "powerKwB" },
] as const;

function hasPhaseData(reading: Reading) {
  return PHASES.some(
    (p) => reading[p.voltageKey] != null || reading[p.currentKey] != null || reading[p.powerKey] != null
  );
}

// Not stored directly — derived from S and P: Q = sqrt(S^2 - P^2), clamped
// at 0 so rounding noise when P ~= S doesn't produce NaN.
function reactivePowerKvar(reading: Reading): number | null {
  if (reading.apparentPowerKva == null) return null;
  const s = reading.apparentPowerKva;
  const p = reading.powerKw;
  return Number(Math.sqrt(Math.max(0, s * s - p * p)).toFixed(2));
}

export function ElectricalParameters({ reading }: { reading: Reading | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Electrical Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        {!reading ? (
          <p className="text-sm text-muted-foreground">No reading data available</p>
        ) : (
          <ElectricalParametersBody reading={reading} />
        )}
      </CardContent>
    </Card>
  );
}

function ElectricalParametersBody({ reading }: { reading: Reading }) {
  const showPhases = hasPhaseData(reading);
  const kvar = reactivePowerKvar(reading);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Param label="Voltage" value={`${reading.voltage} V`} />
        <Param label="Current" value={`${reading.current} A`} />
        <Param label="Active Power" value={`${reading.powerKw} kW`} />
        <Param label="Reactive Power" value={kvar != null ? `${kvar} kVAR` : "—"} />
        <Param
          label="Apparent Power"
          value={reading.apparentPowerKva != null ? `${reading.apparentPowerKva} kVA` : "—"}
        />
        <Param label="Power Factor" value={reading.powerFactor != null ? reading.powerFactor.toFixed(2) : "—"} />
        <Param label="Frequency" value={reading.frequencyHz != null ? `${reading.frequencyHz} Hz` : "—"} />
        {reading.thd != null && <Param label="THD" value={`${reading.thd}%`} />}
      </div>

      {showPhases ? (
        <div className="mt-5 border-t pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Phase-wise Readings
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-normal">Phase</th>
                  <th className="pb-2 pr-4 font-normal">Voltage</th>
                  <th className="pb-2 pr-4 font-normal">Current</th>
                  <th className="pb-2 font-normal">Power</th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map((p) => (
                  <tr key={p.label} className="border-t">
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.label}
                      </span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {reading[p.voltageKey] != null ? `${reading[p.voltageKey]} V` : "—"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {reading[p.currentKey] != null ? `${reading[p.currentKey]} A` : "—"}
                    </td>
                    <td className="py-2 tabular-nums">
                      {reading[p.powerKey] != null ? `${reading[p.powerKey]} kW` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          Phase-wise (R/Y/B) readings aren&apos;t shown — this meter&apos;s data source doesn&apos;t currently
          capture them.
        </p>
      )}
    </>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}