const fs = require('fs');
let shell = fs.readFileSync('src/components/charts/scatter-chart-shell.tsx', 'utf-8');
shell = shell.replace(/const \{ isNumeric, validData \} = useMemo\(\(\) => \{/, `const xRangePadding = useMemo(() => {
    if (lines.length === 0) {
      return 12;
    }
    const maxRadius = Math.max(...lines.map((line) => line.strokeWidth ?? 5));
    return maxRadius + 10;
  }, [lines]);
  
  const { isNumeric, validData } = useMemo(() => {`);
fs.writeFileSync('src/components/charts/scatter-chart-shell.tsx', shell);

let interaction = fs.readFileSync('src/components/charts/use-scatter-chart-interaction.ts', 'utf-8');
interaction = interaction.replace(/\[xScale, yScale, yScales, data, lines, xAccessor\]/g, '[xScale, yScale, yScales, data, lines, xAccessor]');
interaction = interaction.replace(/\[xScale, data, xAccessor\]/g, '[xScale, data, xAccessor]');
// Let's just fix the trailing commas properly.
interaction = interaction.replace(/,\s*,/g, ',');
interaction = interaction.replace(/\[\s*,/g, '[');
interaction = interaction.replace(/,\s*\]/g, ']');

fs.writeFileSync('src/components/charts/use-scatter-chart-interaction.ts', interaction);
