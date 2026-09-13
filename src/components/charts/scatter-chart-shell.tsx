"use client";

import { scaleLinear, scaleTime } from "d3-scale";
import type { Transition } from "motion/react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_ANIMATION_EASING } from "./animation";
import {
  isClipExcludedComponent,
  isPostOverlayComponent,
  isUnderlayComponent,
} from "./chart-child-passthrough";
import {
  type ChartContextValue,
  ChartProvider,
  type LineConfig,
  type Margin,
} from "./chart-context";
import { isGradientDefComponent, isPatternDefComponent } from "./chart-defs";
import { shortDateFmt } from "./chart-formatters";
import { type ChartPhase, DEFAULT_CHART_LIFECYCLE } from "./chart-phase";
import { extractReferenceAreaConfigs } from "./reference-area-config";
import { useScatterChartInteraction } from "./use-scatter-chart-interaction";
import { buildYScalesForLines, getPrimaryYScale } from "./y-axis-scales";

export interface ScatterChartInnerProps {
  width: number;
  height: number;
  data: Record<string, unknown>[];
  xDataKey: string;
  margin: Margin;
  animationDuration: number;
  animationEasing?: string;
  enterTransition?: Transition;
  revealSignature?: string;
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lines: LineConfig[];
  onPhaseChange?: (phase: ChartPhase) => void;
}

export function ScatterChartInner({
  width,
  height,
  data,
  xDataKey,
  margin,
  animationDuration,
  animationEasing = DEFAULT_ANIMATION_EASING,
  enterTransition,
  revealSignature = "",
  children,
  containerRef,
  lines,
  onPhaseChange,
}: ScatterChartInnerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [revealEpoch, setRevealEpoch] = useState(0);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xAccessor = useCallback(
    (d: Record<string, unknown>): Date | number => {
      const value = d[xDataKey];
      if (typeof value === "number") {
        return value;
      }
      return value instanceof Date ? value : new Date(value as string | number);
    },
    [xDataKey],
  );

  const xRangePadding = useMemo(() => {
    if (lines.length === 0) {
      return 12;
    }
    const maxRadius = Math.max(...lines.map((line) => line.strokeWidth ?? 5));
    return maxRadius + 10;
  }, [lines]);
  
  const { isNumeric, validData } = useMemo(() => {
    let firstType = null;
    const valid = [];
    for (const d of data) {
      const val = xAccessor(d);
      if (val instanceof Date && !isNaN(val.getTime())) {
        if (!firstType) firstType = "date";
        if (firstType === "date") valid.push(d);
      } else if (typeof val === "number" && !isNaN(val)) {
        if (!firstType) firstType = "number";
        if (firstType === "number") valid.push(d);
      }
    }
    return { isNumeric: firstType === "number", validData: valid };
  }, [data, xAccessor]);

  const xScale = useMemo(() => {
    if (validData.length === 0) {
      return scaleLinear()
        .range([
          xRangePadding,
          Math.max(xRangePadding, innerWidth - xRangePadding),
        ])
        .domain([0, 1]);
    }

    if (isNumeric) {
      const values = validData.map((d) => xAccessor(d) as number);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      const domainMin = minVal === maxVal ? minVal - 1 : minVal;
      const domainMax = minVal === maxVal ? maxVal + 1 : maxVal;

      return scaleLinear()
        .range([
          xRangePadding,
          Math.max(xRangePadding, innerWidth - xRangePadding),
        ])
        .domain([domainMin, domainMax]);
    }

    const dates = validData.map((d) => xAccessor(d) as Date);
    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));

    const domainMin = minTime === maxTime ? minTime - 86400000 : minTime;
    const domainMax = minTime === maxTime ? maxTime + 86400000 : maxTime;

    return scaleTime()
      .range([
        xRangePadding,
        Math.max(xRangePadding, innerWidth - xRangePadding),
      ])
      .domain([domainMin, domainMax]);
  }, [innerWidth, validData, isNumeric, xAccessor, xRangePadding]);

  const columnWidth = useMemo(() => {
    if (validData.length < 2) {
      return 0;
    }
    return innerWidth / (validData.length - 1);
  }, [innerWidth, validData.length]);

  const yScales = useMemo(
    () =>
      buildYScalesForLines({
        lines,
        data: validData,
        innerHeight,
        resolveDomain: (dataKeys) => {
          let maxValue = 0;
          for (const d of validData) {
            for (const key of dataKeys) {
              const value = d[key];
              if (typeof value === "number" && value > maxValue) {
                maxValue = value;
              }
            }
          }
          const top = maxValue <= 0 ? 100 : maxValue * 1.1;
          return [0, top];
        },
      }),
    [innerHeight, validData, lines],
  );

  const yScale = getPrimaryYScale(
    yScales,
    scaleLinear<number>().range([innerHeight, 0]).domain([0, 100]),
  );

  const dateLabels = useMemo(
    () =>
      validData.map((d) => {
        const val = xAccessor(d);
        return typeof val === "number" ? String(val) : shortDateFmt.format(val);
      }),
    [validData, xAccessor],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: revealSignature
  useEffect(() => {
    setRevealEpoch((n) => n + 1);
    setIsLoaded(false);
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, animationDuration);
    return () => clearTimeout(timer);
  }, [animationDuration, revealSignature]);

  useEffect(() => {
    onPhaseChange?.(isLoaded ? "ready" : "revealing");
  }, [isLoaded, onPhaseChange]);

  const canInteract = isLoaded;

  const {
    tooltipData,
    setTooltipData,
    selection,
    clearSelection,
    interactionHandlers,
    interactionStyle,
  } = useScatterChartInteraction({
    xScale,
    yScale: yScale as ChartContextValue["yScale"],
    yScales: yScales as ChartContextValue["yScales"],
    data: validData,
    lines,
    margin,
    xAccessor,
    canInteract,
  });

  const referenceAreas = useMemo(
    () => extractReferenceAreaConfigs(children),
    [children],
  );

  if (width < 10 || height < 10) {
    return null;
  }

  const defsChildren: ReactElement[] = [];
  const clipExcludedChildren: ReactElement[] = [];
  const underlayChildren: ReactElement[] = [];
  const preOverlayChildren: ReactElement[] = [];
  const postOverlayChildren: ReactElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (isGradientDefComponent(child)) {
      defsChildren.push(child);
    } else if (isPatternDefComponent(child)) {
      preOverlayChildren.push(child);
    } else if (isPostOverlayComponent(child)) {
      postOverlayChildren.push(child);
    } else if (isClipExcludedComponent(child)) {
      clipExcludedChildren.push(child);
    } else if (isUnderlayComponent(child)) {
      underlayChildren.push(child);
    } else {
      preOverlayChildren.push(child);
    }
  });

  const contextValue: ChartContextValue = {
    ...DEFAULT_CHART_LIFECYCLE,
    data: validData,
    renderData: validData,
    xScale: xScale as ChartContextValue["xScale"],
    yScale: yScale as ChartContextValue["yScale"],
    yScales: yScales as ChartContextValue["yScales"],
    width,
    height,
    innerWidth,
    innerHeight,
    margin,
    columnWidth,
    tooltipData,
    setTooltipData,
    containerRef,
    lines,
    referenceAreas,
    isLoaded,
    animationDuration,
    animationEasing,
    enterTransition,
    revealEpoch,
    xAccessor,
    dateLabels,
    selection,
    clearSelection,
  };

  return (
    <ChartProvider value={contextValue}>
      <svg
        aria-hidden="true"
        className="overflow-visible"
        height={height}
        width={width}
      >
        {defsChildren.length > 0 && <defs>{defsChildren}</defs>}

        <rect fill="transparent" height={height} width={width} x={0} y={0} />

        <g
          {...interactionHandlers}
          style={interactionStyle}
          transform={`translate(${margin.left},${margin.top})`}
        >
          <rect
            fill="transparent"
            height={innerHeight}
            width={innerWidth}
            x={0}
            y={0}
          />

          {clipExcludedChildren}
          {underlayChildren}
          {preOverlayChildren}
          {postOverlayChildren}
        </g>
      </svg>
    </ChartProvider>
  );
}
// v2
