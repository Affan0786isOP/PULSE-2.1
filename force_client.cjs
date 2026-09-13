const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

// The issue is that the API returns { success: true, entries: [] }
// So apiSucceeded becomes true!
// And it skips the client-side direct Firestore fetch!
// Let's modify firestore.ts to ALWAYS fall back to client-side fetch if the API returns 0 entries, OR just remove the API call and solely rely on direct Firestore reads.

code = code.replace(/apiSucceeded = true;\n\s*payload\.entries\.forEach/g, 'if (payload.entries.length > 0) apiSucceeded = true;\n        payload.entries.forEach');

fs.writeFileSync('src/lib/firestore.ts', code);
