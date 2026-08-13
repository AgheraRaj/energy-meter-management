interface PowerGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  size?: number;
}

function gaugeColor(pct: number) {
  if (pct >= 95) return "var(--accent-red)";
  if (pct >= 80) return "var(--accent-amber)";
  return "var(--accent-cyan)";
}

export function PowerGauge({ label, value, max, unit, size = 150 }: PowerGaugeProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const color = gaugeColor(pct);
  const arc = `M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path d={arc} fill="none" stroke="var(--muted)" strokeWidth={10} strokeLinecap="round" pathLength={100} />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - pct}
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="text-center">
        <p className="font-mono-ems text-lg font-semibold" style={{ color }}>
          {value.toFixed(1)} <span className="text-xs text-muted-foreground">{unit}</span>
        </p>
        <p className="font-display text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}