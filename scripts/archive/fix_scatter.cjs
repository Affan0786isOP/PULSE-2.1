const fs = require('fs');

let shell = fs.readFileSync('src/components/charts/scatter-chart-shell.tsx', 'utf-8');

shell = shell.replace(
  /const xScale = useMemo\(\(\) => \{[\s\S]*?\}, \[innerWidth, data, xAccessor, xRangePadding\]\);/,
  `const { isNumeric, validData } = useMemo(() => {
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
        .range([xRangePadding, Math.max(xRangePadding, innerWidth - xRangePadding)])
        .domain([0, 1]);
    }

    if (isNumeric) {
      const values = validData.map((d) => xAccessor(d));
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

    const dates = validData.map((d) => xAccessor(d));
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
  }, [innerWidth, validData, isNumeric, xAccessor, xRangePadding]);`
);

shell = shell.replace(/const \{ yScales, yScale \} = useMemo\(\(\) => \{[\s\S]*?\}, \[data, lines, innerHeight\]\);/,
  `const { yScales, yScale } = useMemo(() => {
    const scales = buildYScalesForLines({
      data: validData,
      lines,
      innerHeight,
    });
    return {
      yScales: scales,
      yScale: getPrimaryYScale(scales, lines),
    };
  }, [validData, lines, innerHeight]);`
);

// Replace bisectDate use with linear search in use-scatter-chart-interaction.ts
let interaction = fs.readFileSync('src/components/charts/use-scatter-chart-interaction.ts', 'utf-8');

// The file has crazy newlines, we'll strip them first
interaction = interaction.replace(/\n\s*\n/g, '\n');

// Replace the interface
interaction = interaction.replace(/bisectDate:\s*\([\s\S]*?=>\s*number;/m, '');
interaction = interaction.replace(/bisectDate,/g, '');

// Replace resolveTooltipFromX
interaction = interaction.replace(/const resolveTooltipFromX = useCallback\([\s\S]*?\}, \[\s*xScale,\s*yScale,\s*yScales,\s*data,\s*lines,\s*xAccessor[\s\S]*?\]\);/,
`const resolveTooltipFromX = useCallback(
    (pixelX) => {
      if (data.length === 0) return null;
      let minDiff = Infinity;
      let bestIndex = -1;
      let bestD = data[0];
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const val = xAccessor(d);
        const px = xScale(val);
        if (typeof px === "number") {
          const diff = Math.abs(px - pixelX);
          if (diff < minDiff) {
            minDiff = diff;
            bestIndex = i;
            bestD = d;
          }
        }
      }
      if (bestIndex === -1) return null;
      const yPositions = {};
      for (const line of lines) {
        const value = bestD[line.dataKey];
        if (typeof value === "number") {
          const axisScale = yScales[normalizeYAxisId(line.yAxisId)] ?? yScale;
          yPositions[line.dataKey] = axisScale(value) ?? 0;
        }
      }
      return {
        point: bestD,
        index: bestIndex,
        x: xScale(xAccessor(bestD)) ?? 0,
        yPositions,
      };
    },
    [xScale, yScale, yScales, data, lines, xAccessor]
  );`);

// Replace resolveIndexFromX
interaction = interaction.replace(/const resolveIndexFromX = useCallback\([\s\S]*?\}, \[\s*xScale,\s*data,\s*xAccessor[\s\S]*?\]\);/,
`const resolveIndexFromX = useCallback(
    (pixelX) => {
      if (data.length === 0) return 0;
      let minDiff = Infinity;
      let bestIndex = 0;
      for (let i = 0; i < data.length; i++) {
        const px = xScale(xAccessor(data[i]));
        if (typeof px === "number") {
          const diff = Math.abs(px - pixelX);
          if (diff < minDiff) {
            minDiff = diff;
            bestIndex = i;
          }
        }
      }
      return bestIndex;
    },
    [xScale, data, xAccessor]
  );`);

fs.writeFileSync('src/components/charts/scatter-chart-shell.tsx', shell);
fs.writeFileSync('src/components/charts/use-scatter-chart-interaction.ts', interaction);

// Fix LineTimeSeriesChart.tsx
let lineChart = fs.readFileSync('src/components/dataset/visualizations/LineTimeSeriesChart.tsx', 'utf-8');
lineChart = lineChart.replace(/x: string \| number \| Date;/, 'x: string | Date;');
lineChart = lineChart.replace(/\} else if \(typeof rawX === 'number' && !isNaN\(rawX\)\) \{[\s\S]*?\} else if \(typeof rawX === 'string'\) \{/, `} else if (typeof rawX === 'string') {`);
fs.writeFileSync('src/components/dataset/visualizations/LineTimeSeriesChart.tsx', lineChart);
