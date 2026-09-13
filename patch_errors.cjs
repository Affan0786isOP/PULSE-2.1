const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace console.error('...', err); with console.error('...', err instanceof Error ? err.message : String(err));
// We need to match err, dbErr, txErr, pbErr, fallbackErr, parseErr, etc.
const regex = /console\.(error|warn)\('([^']+)',\s*([a-zA-Z0-9_]+Err(?:or)?|err|e)\);/g;

code = code.replace(regex, "console.$1('$2', $3 instanceof Error ? $3.message : String($3));");

fs.writeFileSync('server.ts', code);
