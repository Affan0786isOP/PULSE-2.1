import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
export interface MedianRtGaugeProps {
  value: number; centerValue: number; activeFill?: string; inactiveFill?: string; className?: string;
}
/** Shared Recharts gauge used by desktop and mobile Direction research views. */
export function MedianRtGauge({
  value, centerValue, activeFill = 'var(--cyan-primary)',
  inactiveFill = 'var(--border-subtle)',
  className = 'relative mx-auto h-[220px] w-full max-w-[280px]',
}: MedianRtGaugeProps) {
  const normalizedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={[{ value: normalizedValue }]} cx="50%" cy="50%" innerRadius="66%" outerRadius="82%" startAngle={135} endAngle={405}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} fill={activeFill} background={{ fill: inactiveFill }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span className="font-mono text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {centerValue > 0 ? centerValue.toLocaleString() : '—'}
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">ms</span>
      </div>
    </div>
  );
}
