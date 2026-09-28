const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Wait, the API still returns an empty array.
// Did the query succeed but return nothing?
// In the console log, does it print any errors?
// The stdout of dev server is not visible. 

// Let's modify the code to return any errors in the API response as well, just for debugging.
code = code.replace(/return res.json\(\{ success: true, entries \}\);/g, 'return res.json({ success: true, entries, debug_log: "Done" });');

code = code.replace(/console\.error\("\[Leaderboard API\] Error fetching leaderboard FULL:", err instanceof Error \? err\.message : String\(err\)\);/g, 'return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });');

fs.writeFileSync('server.ts', code);
