const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We have both console.log("Primary Query Failed") AND console.log("Primary Query Error") because of my replacements.
// More importantly, the fallback ALSO logs instead of doing anything differently.
// Wait, the primary query throws PERMISSION_DENIED. So it goes to catch (qErr: any).
// Inside catch (qErr: any), it runs the fallback query!
// But the fallback query ALSO throws PERMISSION_DENIED because we don't have credentials!

// So how did it ever return entries before?
// Before, when I ran curl the first time:
// {"success":true,"entries":[{"id":"323570af...","displayName":"Affan"...}]}
// IT WAS IN MEMORY!
// Because the user had JUST submitted a score!
// When I restarted the server, the memory map was cleared.
// This means the leaderboard ONLY works based on the memory map unless the server has Firebase Admin credentials.
