const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'return res.json({ success: true, entries, debug_log: "Done" });',
  'return res.json({ success: true, entries: [], debug_log: "Done" });'
);

fs.writeFileSync('server.ts', code);
