const fs = require('fs');
let config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
config.compilerOptions.esModuleInterop = true;
config.compilerOptions.resolveJsonModule = true;
config.compilerOptions.downlevelIteration = true;
fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2));
