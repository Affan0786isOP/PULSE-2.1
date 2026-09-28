const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/if \(\!process\.env\.VERCEL\)/g, "if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NOW_REGION)");

fs.writeFileSync('server.ts', code);
