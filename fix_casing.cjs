const fs = require('fs');

const filesToUpdate = ['src/lib/firestore.ts', 'server.ts'];

for (const file of filesToUpdate) {
  let code = fs.readFileSync(file, 'utf8');

  // We want to make sure uppercase names like "Ady" aren't failing due to something stupid.
  // Wait, let's look at isOptedInLeaderboardUser
  // const trimmed = String(displayName || '').trim();
  // const lower = trimmed.toLowerCase();
  // if (lower === 'anonymous' || lower === 'unknown' || lower === 'guest') return false;
  // if (lower.startsWith('participant')) return false;
  // return true;

  // This function is perfectly fine. The issue might be the `hidden` field, or the document just isn't returned from firestore?
  // But firestore console screenshot shows:
  // displayName: "Ady"
  // hidden: false (Wait, it's NOT in the screenshot! Let's check screenshot again).
}
