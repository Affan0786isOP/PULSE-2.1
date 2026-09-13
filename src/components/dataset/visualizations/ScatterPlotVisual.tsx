import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  Grid,
  XAxis,
  YAxis,
  ChartTooltip as BklitChartTooltip,
} from '@bklitui/ui/charts';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { CHART_PALETTE, CHART_DIMENSIONS } from './tokens';
import { formatValueWithUnit } from './formatting';

export interface ScatterDataPoint {
  x: number;
  y: number;
  z?: number;
  label?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

interface ScatterPlotVisualProps {
  title: string;
  subtitle?: string;
  badge?: string;
  data: ScatterDataPoint[];
  xAxisName?: string;
  yAxisName?: string;
  xUnit?: string;
  yUnit?: string;
  pointColor?: string;
  height?: number;
  id?: string;
  emptyMessage?: string;
}

export function ScatterPlotVisual({
  title,
  subtitle,
  badge,
  data,
  xAxisName = 'X Variable',
  yAxisName = 'Y Variable',
  xUnit,
  yUnit,
  pointColor = CHART_PALETTE.primaryHex,
  height = CHART_DIMENSIONS.defaultHeight,
  id,
  emptyMessage
}: ScatterPlotVisualProps) {
  const validData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(
      d =>
        typeof d.x === 'number' &&
        !isNaN(d.x) &&
        isFinite(d.x) &&
        typeof d.y === 'number' &&
        !isNaN(d.y) &&
        isFinite(d.y)
    );
  }, [data]);

  const hasData = validData.length > 0;

  // Format valid data for Bklit Scatter engine
  const chartData = useMemo(() => {
    if (!hasData) return [];
    return validData.map((d, idx) => ({
      ...d,
      __bklit_x: d.x,
      y: d.y,
    }));
  }, [validData, hasData]);

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
          title="No Telemetry Data Points"
          message={emptyMessage || "No valid bivariate observations available for scatter plot mapping."}
          height={height - 60}
        />
      ) : (
        <div className="w-full h-full min-h-0 relative flex flex-col justify-between">
          <div className="flex-1 min-h-0 relative">
            <ScatterChart
              data={chartData}
              xDataKey="__bklit_x"
              margin={{ top: 20, right: 25, left: 35, bottom: 35 }}
              className="w-full h-full"
            >
              <Grid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} />
              <XAxis numTicks={Math.min(chartData.length, 6)} />
              <YAxis formatValue={(val) => formatValueWithUnit(val, undefined, 0)} />
              <Scatter
                dataKey="y"
                fill={pointColor}
                stroke={pointColor}
                radius={4}
              />
              <BklitChartTooltip
                showDatePill={false}
                rows={(point) => [
                  ...(point.label ? [{ label: 'Trial', value: String(point.label), color: pointColor }] : []),
                  {
                    label: xAxisName,
                    value: formatValueWithUnit(point.x as number, xUnit, 0),
                    color: '#94A3B8',
                  },
                  {
                    label: yAxisName,
                    value: formatValueWithUnit(point.y as number, yUnit, 0),
                    color: pointColor,
                  },
                ]}
              />
            </ScatterChart>
          </div>

          <div className="flex items-center justify-between px-3 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] shrink-0">
            <span>X: <strong className="text-[var(--text-secondary)]">{xAxisName}{xUnit ? ` (${xUnit})` : ''}</strong></span>
            <span>Y: <strong className="text-[var(--text-secondary)]">{yAxisName}{yUnit ? ` (${yUnit})` : ''}</strong></span>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
