import React from 'react';
import { CHART_TOOLTIP_STYLE } from './tokens';

export interface ChartTooltipRow {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: any;
    color?: string;
    payload?: any;
    dataKey?: string;
  }>;
  label?: string | number;
  title?: string;
  formatter?: (value: any, name?: string, item?: any) => [string, string];
  customRows?: (payload: any) => ChartTooltipRow[];
}

export function ChartTooltip({
  active,
  payload,
  label,
  title,
  formatter,
  customRows
}: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div style={CHART_TOOLTIP_STYLE} className="min-w-[140px] pointer-events-none z-50">
      {(title || label !== undefined) && (
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] pb-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
          {title || label}
        </div>
      )}

      {customRows ? (
        <div className="space-y-1">
          {customRows(payload[0]?.payload).map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono text-[11px]">
                {row.color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                )}
                <span>{row.label}</span>
              </span>
              <span className="font-mono font-bold text-[var(--text-main)] tabular-nums text-[11px]">
                {row.value} {row.unit && <span className="font-normal text-[var(--text-muted)] text-[10px]">{row.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {payload.map((item, idx) => {
            const formatted = formatter ? formatter(item.value, item.name, item) : null;
            const displayLabel = formatted ? formatted[1] : (item.name || item.dataKey || 'Value');
            const displayVal = formatted ? formatted[0] : (item.value !== null && item.value !== undefined ? item.value : '—');
            const itemColor = item.color || '#22C7D6';

            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                  <span className="capitalize">{displayLabel}</span>
                </span>
                <span className="font-mono font-bold text-[var(--text-main)] tabular-nums text-[11px]">
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
