const fs = require('fs');

let shell = fs.readFileSync('src/components/charts/scatter-chart-shell.tsx', 'utf-8');
shell = shell.replace(/const values = validData\.map\(\(d\) => xAccessor\(d\)\);/g, `const values = validData.map((d) => xAccessor(d) as number);`);
shell = shell.replace(/const dates = validData\.map\(\(d\) => xAccessor\(d\)\);/g, `const dates = validData.map((d) => xAccessor(d) as Date);`);
shell = shell.replace(/const bisectDate = useMemo\([\s\S]*?\]\);/, '');

fs.writeFileSync('src/components/charts/scatter-chart-shell.tsx', shell);

let interaction = fs.readFileSync('src/components/charts/use-scatter-chart-interaction.ts', 'utf-8');
interaction = interaction.replace(/bisectDate/g, '');
interaction = interaction.replace(/,\s*,/g, ',');
interaction = interaction.replace(/\[\s*,/g, '[');
interaction = interaction.replace(/,\s*\]/g, ']');

fs.writeFileSync('src/components/charts/use-scatter-chart-interaction.ts', interaction);
