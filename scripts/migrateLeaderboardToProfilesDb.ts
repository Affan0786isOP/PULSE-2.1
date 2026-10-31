import type { PublicLeaderboardEntry } from '../shared/contracts/profiles';

export async function runLeaderboardMigrationBatch(
  legacyDocs: Array<{ id: string; data: () => any }>,
  targetDb: any
): Promise<number> {
  let count = 0;

  for (const doc of legacyDocs) {
    const data = doc.data();
    const entry: PublicLeaderboardEntry = {
      id: doc.id,
      displayName: String(data.displayName || 'Anonymous Participant'),
      assessmentType: data.assessmentType,
      scoreMetric: typeof data.scoreMetric === 'number' ? data.scoreMetric : 0,
      accuracy: typeof data.accuracy === 'number' ? data.accuracy : null,
      ageGroup: typeof data.ageGroup === 'string' ? data.ageGroup : null,
      hasRegisteredProfile: false, // Preserves historical guest status
      resultValidationStatus: 'validated',
      hidden: Boolean(data.hidden),
      submittedAtMonth: data.submittedAtMonth || new Date().toISOString().substring(0, 7),
      createdAt: data.createdAt || Date.now()
    };

    await targetDb.collection('leaderboardResults').doc(doc.id).set(entry);
    count++;
  }

  return count;
}
