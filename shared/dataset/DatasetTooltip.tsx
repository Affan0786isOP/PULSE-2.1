import type { ReactNode } from 'react';
interface TooltipPayloadItem {
  name?: string; value?: number | string; color?: string; fill?: string;
  unit?: string; dataKey?: string | number; payload?: Record<string, unknown>;
}
export interface DatasetTooltipProps {
  active?: boolean; payload?: TooltipPayloadItem[]; label?: string | number;
  variant?: 'standard' | 'direction';
}
export function DatasetTooltip({ active, payload, label, variant = 'standard' }: DatasetTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface-solid)] backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-3 shadow-xl font-mono text-xs z-50 text-[var(--text-primary)]">
      {label !== undefined && (
        <div className="text-[var(--text-muted)] font-semibold mb-1.5 border-b border-[var(--border-subtle)] pb-1">
          {variant === 'direction' && typeof label === 'number' ? `Trial ${label}` : String(label)}
        </div>
      )}
      {payload.map((entry, index) => {
        const color = entry.color || entry.fill || 'var(--cyan-primary)';
        const sampleCount = entry.dataKey !== undefined ? entry.payload?.[`${entry.dataKey}N`] : undefined;
        const count = sampleCount !== undefined ? sampleCount : entry.payload?.n;
        const value = variant === 'direction'
          ? entry.name === 'Accuracy'
            ? typeof entry.value === 'number'
              ? entry.value <= 1 && entry.value >= 0 && entry.value % 1 !== 0
                ? `${Math.round(entry.value * 100)}%`
                : `${entry.value}%`
              : `${entry.value}%`
            : `${entry.value} ms`
          : `${entry.value} ${entry.unit || ''}`;
        const iqrText = entry.payload?.iqr !== undefined ? ` • IQR: ${entry.payload.iqr}ms` : '';
        return (
          <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-4 py-0.5" style={{ color }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[var(--text-secondary)]">{entry.name || 'Value'}:</span>
            </div>
            <span className="font-bold">
              {value}
              {variant === 'standard' && count !== undefined ? (
                <span className="text-[var(--text-muted)] ml-1 font-normal">(n={String(count)}{iqrText})</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
