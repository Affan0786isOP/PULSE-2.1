const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/await import\('vite'\)/g, `await import('vi' + 'te')`);

fs.writeFileSync('server.ts', code);
