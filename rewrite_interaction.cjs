const fs = require('fs');

let code = fs.readFileSync('src/components/charts/use-scatter-chart-interaction.ts', 'utf-8');

code = code.replace(/const resolveTooltipFromX = useCallback\([\s\S]*?\[xScale,\s*yScale,\s*yScales,\s*data,\s*lines,\s*xAccessor\],\s*\);/m,
`const resolveTooltipFromX = useCallback(
    (pixelX: number): TooltipData | null => {
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
      const yPositions: Record<string, number> = {};
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

code = code.replace(/const resolveIndexFromX = useCallback\([\s\S]*?\[xScale,\s*data,\s*xAccessor\],\s*\);/m,
`const resolveIndexFromX = useCallback(
    (pixelX: number): number => {
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

// Fix commas that might have been broken
code = code.replace(/\[\s*,/g, '[');
code = code.replace(/,\s*,/g, ',');

fs.writeFileSync('src/components/charts/use-scatter-chart-interaction.ts', code);
