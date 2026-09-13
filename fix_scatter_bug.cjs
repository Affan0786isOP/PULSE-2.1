const fs = require('fs');

let shell = fs.readFileSync('src/components/charts/scatter-chart-shell.tsx', 'utf-8');

// Replace `data` with `validData` in the relevant places.

// columnWidth computation
shell = shell.replace(
  /const columnWidth = useMemo\(\(\) => \{\n    if \(data.length < 2\) \{\n      return 0;\n    \}\n    return innerWidth \/ \(data.length - 1\);\n  \}, \[innerWidth, data.length\]\);/g,
  `const columnWidth = useMemo(() => {
    if (validData.length < 2) {
      return 0;
    }
    return innerWidth / (validData.length - 1);
  }, [innerWidth, validData.length]);`
);

// yScales computation
shell = shell.replace(
  /buildYScalesForLines\(\{\n        lines,\n        data,\n        innerHeight,\n        resolveDomain: \(dataKeys\) => \{\n          let maxValue = 0;\n          for \(const d of data\) \{/g,
  `buildYScalesForLines({
        lines,
        data: validData,
        innerHeight,
        resolveDomain: (dataKeys) => {
          let maxValue = 0;
          for (const d of validData) {`
);

shell = shell.replace(
  /      \}\),\n    \[innerHeight, data, lines\],\n  \);/g,
  `      }),
    [innerHeight, validData, lines],
  );`
);

// dateLabels computation
shell = shell.replace(
  /const dateLabels = useMemo\(\n    \(\) =>\n      data.map\(\(d\) => \{\n        const val = xAccessor\(d\);\n        return typeof val === "number" \? String\(val\) : shortDateFmt.format\(val\);\n      \}\),\n    \[data, xAccessor\],\n  \);/g,
  `const dateLabels = useMemo(
    () =>
      validData.map((d) => {
        const val = xAccessor(d);
        return typeof val === "number" ? String(val) : shortDateFmt.format(val);
      }),
    [validData, xAccessor],
  );`
);

// useScatterChartInteraction call
shell = shell.replace(
  /    yScales: yScales as ChartContextValue\["yScales"\],\n    data,\n    lines,/g,
  `    yScales: yScales as ChartContextValue["yScales"],
    data: validData,
    lines,`
);

// ChartContextValue
shell = shell.replace(
  /    \.\.\.DEFAULT_CHART_LIFECYCLE,\n    data,\n    renderData: data,/g,
  `    ...DEFAULT_CHART_LIFECYCLE,
    data: validData,
    renderData: validData,`
);

// Remove unused import 'bisector' from 'd3-array'
shell = shell.replace(/import \{ bisector \} from "d3-array";\n/g, '');

fs.writeFileSync('src/components/charts/scatter-chart-shell.tsx', shell);
