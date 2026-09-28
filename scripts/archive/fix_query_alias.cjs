const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The error could be that the `catch` block is being triggered because of missing indexes?
// Let's add a console.log inside the catch block and API block to see what's happening.

code = code.replace(/catch \(qErr: any\) {/g, 'catch (qErr: any) {\n            console.log("Primary Query Error:", qErr);');
code = code.replace(/catch \(fallbackErr: any\) {/g, 'catch (fallbackErr: any) {\n              console.log("Fallback Query Error:", fallbackErr);');
code = code.replace(/catch \(err\) {\n\s*console\.error\('\[Leaderboard API\] Error fetching leaderboard:/g, 'catch (err) {\n      console.error("[Leaderboard API] Error fetching leaderboard FULL:", err);');

fs.writeFileSync('server.ts', code);
