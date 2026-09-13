const fs = require('fs');
let shell = fs.readFileSync('src/components/charts/scatter-chart-shell.tsx', 'utf-8');
shell = shell.replace(/bisectDate,\s*/g, '');
fs.writeFileSync('src/components/charts/scatter-chart-shell.tsx', shell);
