import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  BarXAxis,
  BarYAxis,
  Grid,
  ChartTooltip as BklitChartTooltip,
} from '@bklitui/ui/charts';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { CHART_PALETTE, CHART_DIMENSIONS } from './tokens';
import { formatValueWithUnit } from './formatting';

export interface ComparisonSeriesConfig {
  key: string;
  label: string;
  color: string;
}

export interface ComparisonDataItem {
  category: string;
  [seriesKey: string]: any;
}

interface GroupedComparisonChartProps {
  title: string;
  subtitle?: string;
  badge?: string;
  data: ComparisonDataItem[];
  series: ComparisonSeriesConfig[];
  unit?: string;
  categoryKey?: string;
  height?: number;
  id?: string;
  emptyMessage?: string;
}

export function GroupedComparisonChart({
  title,
  subtitle,
  badge,
  data,
  series,
  unit = 'ms',
  categoryKey = 'category',
  height = CHART_DIMENSIONS.defaultHeight,
  id,
  emptyMessage
}: GroupedComparisonChartProps) {
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  const chartData = useMemo(() => {
    if (!hasData) return [];
    return data.map((d) => ({
      ...d,
      [categoryKey]: String(d[categoryKey] ?? ''),
    }));
  }, [data, categoryKey, hasData]);

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
          title="No Comparison Telemetry"
          message={emptyMessage || "No comparative data points available for multi-cohort evaluation."}
          height={height - 60}
        />
      ) : (
        <div className="w-full h-full min-h-0 relative flex flex-col justify-between">
          <div className="flex-1 min-h-0 relative">
            <BarChart
              data={chartData}
              xDataKey={categoryKey}
              orientation="vertical"
              margin={{ top: 20, right: 20, left: 30, bottom: 35 }}
              barGap={0.2}
              className="w-full h-full"
            >
              <Grid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} />
              <BarXAxis showAllLabels maxLabels={12} />
              <BarYAxis showAllLabels maxLabels={6} />
              {series.map(s => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  fill={s.color}
                  lineCap={3}
                />
              ))}
              <BklitChartTooltip
                showDatePill={false}
                rows={(point) =>
                  series.map(s => ({
                    label: s.label,
                    value: formatValueWithUnit(point[s.key] as number, unit, 0),
                    color: s.color,
                  }))
                }
              />
            </BarChart>
          </div>

          {/* Accessible, custom-styled legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono shrink-0">
            {series.map(s => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[var(--text-secondary)]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
