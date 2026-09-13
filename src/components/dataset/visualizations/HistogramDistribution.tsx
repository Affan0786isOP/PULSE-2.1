import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  BarXAxis,
  BarYAxis,
  Grid,
  ChartTooltip as BklitChartTooltip,
} from '@bklitui/ui/charts';
import { HistogramBin } from '../../../lib/dataset/types';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { CHART_PALETTE, CHART_DIMENSIONS } from './tokens';
import { formatCount, formatPercentage } from './formatting';

interface HistogramDistributionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  bins: HistogramBin[];
  mean?: number | null;
  median?: number | null;
  unit?: string;
  height?: number;
  id?: string;
  emptyMessage?: string;
}

export function HistogramDistribution({
  title,
  subtitle,
  badge,
  bins,
  mean,
  median,
  unit = 'ms',
  height = CHART_DIMENSIONS.defaultHeight,
  id,
  emptyMessage
}: HistogramDistributionProps) {
  const hasData = useMemo(() => {
    return Array.isArray(bins) && bins.length > 0 && bins.some(b => b.count > 0);
  }, [bins]);

  const chartData = useMemo(() => {
    if (!bins) return [];
    return bins.map(b => ({
      label: b.binLabel,
      binStart: b.binStart,
      binEnd: b.binEnd,
      count: b.count,
      percentage: b.percentage,
    }));
  }, [bins]);

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
          title="Insufficient Distribution Data"
          message={emptyMessage || "No valid numerical trials available to construct empirical density bins."}
          height={height - 60}
        />
      ) : (
        <div className="w-full h-full min-h-0 relative flex flex-col justify-between">
          <div className="flex-1 min-h-0 relative">
            <BarChart
              data={chartData}
              xDataKey="label"
              orientation="vertical"
              margin={{ top: 20, right: 20, left: 30, bottom: 35 }}
              barGap={0.2}
              className="w-full h-full"
            >
              <Grid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} />
              <BarXAxis showAllLabels maxLabels={10} />
              <BarYAxis showAllLabels maxLabels={6} />
              <Bar
                dataKey="count"
                fill={CHART_PALETTE.primaryHex}
                lineCap={4}
              />
              <BklitChartTooltip
                showDatePill={false}
                rows={(point) => [
                  {
                    label: 'Interval',
                    value: String(point.label ?? ''),
                    color: CHART_PALETTE.primaryHex,
                  },
                  {
                    label: 'Trials Observed',
                    value: `${formatCount(point.count as number)} (${formatPercentage(point.percentage as number, 1)})`,
                    color: CHART_PALETTE.secondary,
                  }
                ]}
              />
            </BarChart>
          </div>

          {((mean !== undefined && mean !== null) || (median !== undefined && median !== null)) && (
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--border-subtle)]/60 text-[11px] font-mono shrink-0">
              {mean !== undefined && mean !== null && (
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="w-2.5 h-0.5 rounded-full bg-[var(--cyan-primary)]" />
                  <span>Mean: <strong className="text-[var(--text-main)]">{Math.round(mean)} {unit}</strong></span>
                </div>
              )}
              {median !== undefined && median !== null && (
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="w-2.5 h-0.5 rounded-full bg-amber-400" />
                  <span>Median (p50): <strong className="text-[var(--text-main)]">{Math.round(median)} {unit}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ChartContainer>
  );
}
