const fs = require('fs');
function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/const res = await fetchWithAuth\('\/api\/leaderboard\/submit',/g,
    `export const submitLeaderboardResult = async (payload: BasePayload & { trials: any[], scoreMetric: number, displayName: string }): Promise<{success: boolean, syncedToCloud: boolean, error?: string}> => {
  try {
    const uid = auth?.currentUser?.uid;
    const activeSessionId = payload.sessionId || payload.idempotencyKey;
    const activeIdempotencyKey = payload.idempotencyKey ? \`\${payload.idempotencyKey}-leaderboard\` : safeRandomUUID();
    const res = await fetchWithAuth('/api/leaderboard/submit',`);

  fs.writeFileSync(filePath, content);
}
fix('src/lib/firestore.ts');
fix('mobile/src/lib/firestore.ts');
