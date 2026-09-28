const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /console\.error\("([^"]+)",\s*err\);/g;
code = code.replace(regex, 'console.error("$1", err instanceof Error ? err.message : String(err));');

fs.writeFileSync('server.ts', code);
