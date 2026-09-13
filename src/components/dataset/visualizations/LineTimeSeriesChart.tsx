import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  Area,
  Grid,
  XAxis,
  YAxis,
  ReferenceArea,
  ChartTooltip as BklitChartTooltip,
} from "@bklitui/ui/charts";
import { ChartContainer } from "./ChartContainer";
import { ChartEmptyState } from "./ChartEmptyState";
import { CHART_PALETTE, CHART_DIMENSIONS } from "./tokens";
import { formatValueWithUnit } from "./formatting";

export interface TimeSeriesDataPoint {
  x: string | Date;
  label?: string;
  [key: string]: any;
}

export interface LineSeriesConfig {
  key: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  isDashed?: boolean;
  withAreaFill?: boolean;
  dot?: boolean;
}

interface LineTimeSeriesChartProps {
  title: string;
  subtitle?: string;
  badge?: string;
  data: TimeSeriesDataPoint[];
  series: LineSeriesConfig[];
  xAxisKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
  referenceLineY?: number;
  referenceLineLabel?: string;
  height?: number;
  id?: string;
  emptyMessage?: string;
}

export function LineTimeSeriesChart({
  title,
  subtitle,
  badge,
  data,
  series,
  xAxisKey = "x",
  unit = "ms",
  referenceLineY,
  referenceLineLabel,
  height = CHART_DIMENSIONS.defaultHeight,
  id,
  emptyMessage,
  xAxisLabel,
  yAxisLabel,
}: LineTimeSeriesChartProps) {
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  // Ensure safe temporal domain for Bklit TimeSeries engine
  const chartData = useMemo(() => {
    if (!hasData) return [];
    const validData = [];
    for (let index = 0; index < data.length; index++) {
      const d = data[index];
      const rawX = d[xAxisKey];
      let dateVal: Date | undefined;

      if (rawX instanceof Date && !isNaN(rawX.getTime())) {
        dateVal = rawX;
      } else if (typeof rawX === "number" && !isNaN(rawX)) {
        if (rawX > 1000000000) dateVal = new Date(rawX);
      } else if (typeof rawX === "string") {
        const parsed = new Date(rawX);
        if (!isNaN(parsed.getTime())) dateVal = parsed;
      }

      if (dateVal !== undefined) {
        validData.push({
          ...d,
          __bklit_date: dateVal,
          __display_label: String(
            d.label || d[xAxisKey] || `Point ${index + 1}`,
          ),
        });
      }
    }
    return validData;
  }, [data, xAxisKey, hasData]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      badge={badge}
      height={height}
      id={id}
    >
      {chartData.length === 0 ? (
        <ChartEmptyState message={emptyMessage} height={height - 60} />
      ) : (
        <div className="w-full h-full min-h-0 relative flex flex-col justify-between">
          <div className="flex-1 min-h-0 relative">
            <LineChart
              data={chartData}
              xDataKey="__bklit_date"
              margin={{ top: 20, right: 25, left: 35, bottom: 35 }}
              className="w-full h-full"
            >
              <Grid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} />
              <XAxis numTicks={Math.min(chartData.length, 6)} />
              <YAxis
                formatValue={(val) => formatValueWithUnit(val, undefined, 0)}
              />

              {referenceLineY !== undefined && (
                <ReferenceArea
                  y1={referenceLineY}
                  y2={referenceLineY}
                  stroke={CHART_PALETTE.warningHex}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
              )}

              {series.map((s, idx) => {
                const color =
                  s.color ||
                  CHART_PALETTE.series[idx % CHART_PALETTE.series.length];
                const dashProps = s.isDashed
                  ? { dashFromIndex: 0, dashArray: "4 4" }
                  : {};
                const dotProps = s.dot ? { showMarkers: true } : {};

                if (s.withAreaFill) {
                  return (
                    <Area
                      key={s.key}
                      dataKey={s.key}
                      fill={color}
                      stroke={color}
                      strokeWidth={s.strokeWidth || 2}
                      {...dashProps}
                      {...dotProps}
                    />
                  );
                }

                return (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    stroke={color}
                    strokeWidth={s.strokeWidth || 2}
                    {...dashProps}
                    {...dotProps}
                  />
                );
              })}
              <BklitChartTooltip
                showDatePill={false}
                rows={(point) =>
                  series.map((s, idx) => ({
                    label: s.name,
                    value: formatValueWithUnit(point[s.key] as number, unit, 0),
                    color:
                      s.color ||
                      CHART_PALETTE.series[idx % CHART_PALETTE.series.length],
                  }))
                }
              />
            </LineChart>
          </div>

          {(xAxisLabel || yAxisLabel) && (
            <div className="flex items-center justify-between px-3 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] shrink-0">
              {xAxisLabel ? (
                <span>
                  X:{" "}
                  <strong className="text-[var(--text-secondary)]">
                    {xAxisLabel}
                  </strong>
                </span>
              ) : (
                <span />
              )}
              {yAxisLabel ? (
                <span>
                  Y:{" "}
                  <strong className="text-[var(--text-secondary)]">
                    {yAxisLabel}
                  </strong>
                </span>
              ) : (
                <span />
              )}
            </div>
          )}

          {/* Series Legend & Reference Target Display */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono shrink-0">
            {series.map((s, idx) => {
              const color =
                s.color ||
                CHART_PALETTE.series[idx % CHART_PALETTE.series.length];
              return (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[var(--text-secondary)]">{s.name}</span>
                </div>
              );
            })}
            {referenceLineY !== undefined && (
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="w-3 h-0.5 border-b border-dashed border-amber-400" />
                <span>
                  {referenceLineLabel || "Baseline"}:{" "}
                  <strong className="text-amber-400">
                    {referenceLineY} {unit}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
