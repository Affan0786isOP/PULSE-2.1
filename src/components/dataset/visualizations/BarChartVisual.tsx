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

export interface BarChartItem {
  id?: string;
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  [key: string]: any;
}

interface BarChartVisualProps {
  title: string;
  subtitle?: string;
  badge?: string;
  data: BarChartItem[];
  valueKey?: string;
  labelKey?: string;
  unit?: string;
  orientation?: 'vertical' | 'horizontal';
  barColor?: string;
  height?: number;
  id?: string;
  emptyMessage?: string;
  highlightHighest?: boolean;
}

export function BarChartVisual({
  title,
  subtitle,
  badge,
  data,
  valueKey = 'value',
  labelKey = 'label',
  unit,
  orientation = 'vertical',
  barColor = CHART_PALETTE.primaryHex,
  height = CHART_DIMENSIONS.defaultHeight,
  id,
  emptyMessage,
  highlightHighest = false
}: BarChartVisualProps) {
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  // Format data for Bklit BarChart
  const chartData = useMemo(() => {
    if (!hasData) return [];
    
    let maxVal = -Infinity;
    if (highlightHighest) {
      for (const d of data) {
        const val = d[valueKey];
        if (typeof val === 'number' && !isNaN(val) && val > maxVal) {
          maxVal = val;
        }
      }
    }

    return data.map((d) => {
      const val = typeof d[valueKey] === 'number' && !isNaN(d[valueKey]) ? d[valueKey] : undefined;
      const isHighest = highlightHighest && val === maxVal;
      return {
        ...d,
        [labelKey]: String(d[labelKey] ?? ''),
        [valueKey]: val,
        __valueNormal: isHighest ? undefined : val,
        __valueHighlight: isHighest ? val : undefined,
      };
    });
  }, [data, labelKey, valueKey, hasData, highlightHighest]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      badge={badge}
      height={height}
      id={id}
    >
      {!hasData ? (
        <ChartEmptyState message={emptyMessage} height={height - 60} />
      ) : (
        <div className="w-full h-full min-h-0 relative">
          <BarChart
            data={chartData}
            xDataKey={labelKey}
            orientation={isHorizontal ? 'horizontal' : 'vertical'}
            margin={
              isHorizontal
                ? { top: 16, right: 30, left: 80, bottom: 20 }
                : { top: 20, right: 20, left: 30, bottom: 35 }
            }
            barGap={0.25}
            stacked={highlightHighest}
            className="w-full h-full"
          >
            <Grid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} />
            {isHorizontal ? (
              <BarYAxis showAllLabels maxLabels={20} />
            ) : (
              <BarXAxis showAllLabels maxLabels={16} />
            )}
            
            {highlightHighest ? (
              <>
                <Bar dataKey="__valueNormal" fill={CHART_PALETTE.borderDefault} lineCap={4} />
                <Bar dataKey="__valueHighlight" fill={barColor} lineCap={4} />
              </>
            ) : (
              <Bar dataKey={valueKey} fill={barColor} lineCap={4} />
            )}

            <BklitChartTooltip
              showDatePill={false}
              rows={(point) => {
                const val = point[valueKey];
                const isHighlight = highlightHighest && point.__valueHighlight !== undefined;
                return [
                  {
                    label: String(point[labelKey] ?? 'Category'),
                    value: val !== undefined ? formatValueWithUnit(val as number, unit, 0) : '-',
                    color: isHighlight ? barColor : (highlightHighest ? CHART_PALETTE.borderDefault : barColor),
                  }
                ];
              }}
            />
          </BarChart>
        </div>
      )}
    </ChartContainer>
  );
}
