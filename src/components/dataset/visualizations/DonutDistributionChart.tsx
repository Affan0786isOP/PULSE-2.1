import React, { useMemo } from 'react';
import {
  PieChart,
  PieSlice,
  PieCenter,
} from '@bklitui/ui/charts';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { CHART_PALETTE, CHART_DIMENSIONS } from './tokens';

export interface DonutDataItem {
  label: string;
  value: number;
  color?: string;
}

interface DonutDistributionChartProps {
  title: string;
  subtitle?: string;
  badge?: string;
  data: DonutDataItem[];
  unit?: string;
  height?: number;
  centerLabel?: string;
  id?: string;
  emptyMessage?: string;
}

export function DonutDistributionChart({
  title,
  subtitle,
  badge,
  data,
  unit = 'trials',
  height = CHART_DIMENSIONS.defaultHeight,
  centerLabel = 'Total',
  id,
  emptyMessage
}: DonutDistributionChartProps) {
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0 && data.some(d => d.value > 0);
  }, [data]);

  const pieData = useMemo(() => {
    if (!hasData) return [];
    return data.map((d, index) => ({
      label: d.label,
      value: d.value,
      color: d.color || CHART_PALETTE.series[index % CHART_PALETTE.series.length],
    }));
  }, [data, hasData]);

  const totalValue = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieData]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      badge={badge}
      height={height}
      id={id}
    >
      {!hasData ? (
        <ChartEmptyState
          title="No Category Telemetry"
          message={emptyMessage || "No categorical distribution telemetry available in active slice."}
          height={height - 60}
        />
      ) : (
        <div className="w-full h-full min-h-0 relative flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Donut Chart Core */}
          <div className="flex-1 w-full h-[180px] md:h-full relative flex items-center justify-center">
            <PieChart
              data={pieData}
              innerRadius={55}
              cornerRadius={4}
              padAngle={0.03}
              hoverOffset={8}
              className="w-full h-full max-w-[220px] max-h-[220px]"
            >
              {pieData.map((d, index) => (
                <PieSlice
                  key={d.label}
                  index={index}
                  color={d.color}
                  hoverEffect="translate"
                  showGlow
                />
              ))}
              <PieCenter
                defaultLabel={centerLabel}
                valueClassName="text-xl font-bold font-mono text-[var(--text-main)]"
                labelClassName="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)]"
              />
            </PieChart>
          </div>

          {/* Interactive Legend List */}
          <div className="w-full md:w-48 shrink-0 flex flex-col justify-center gap-1.5 font-mono text-xs max-h-[200px] overflow-y-auto scrollbar-none border-t md:border-t-0 md:border-l border-[var(--border-subtle)] pt-2 md:pt-0 md:pl-3">
            {pieData.map(item => {
              const pct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-[var(--bg-panel)] transition-colors">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[var(--text-secondary)] truncate text-[11px]">{item.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                    <span className="font-bold text-[var(--text-main)] text-[11px]">{item.value.toLocaleString()}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
