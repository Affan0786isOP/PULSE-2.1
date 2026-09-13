const fs = require('fs');

const original = `import { doc, setDoc, getDoc, waitForPendingWrites, serverTimestamp, collection, query, where, orderBy, getDocs, getDocsFromServer, limit } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getRawTrialObservations } from './trialStore';
import { db, auth, isConfigured, authInitPromise } from './firebase';

export const isFirestoreAvailable = (): boolean => {
  return Boolean(isConfigured && db);
};

export const safeRandomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11);
};

export const safeWaitForPendingWrites = async (dbInstance: any, timeoutMs = 3000) => {
  if (!dbInstance) return;
  try {
    await Promise.race([
      waitForPendingWrites(dbInstance),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  } catch (e) {
  }
};

export const ensureFirebaseReady = async (): Promise<boolean> => {
  if (!isConfigured || !db || !auth) return false;
  try { await authInitPromise; return true; } catch { return false; }
};

export const ensureAuthenticatedUser = async (): Promise<boolean> => {
  if (!isConfigured || !auth) return false;
  try {
    await authInitPromise;
    if (auth.currentUser) return true;
    await signInAnonymously(auth);
    return Boolean(auth.currentUser);
  } catch (error) {
    return false;
  }
};

export const VALID_AGE_GROUPS = [
  'Children (8–12)', 'Adolescents (13–17)', 'Young adults (18–25)', 
  'Adults (26–40)', 'Middle-aged adults (41–60)', 'Older adults (61–75)', 'Seniors (76+)'
] as const;

export type AgeGroup = typeof VALID_AGE_GROUPS[number];
export type AssessmentType = 'visual-reaction' | 'direction' | 'color-recognition' | 'block-memory' | 'number-memory';

export type BasePayload = {
  assessmentType: AssessmentType;
  ageGroup: string;
  idempotencyKey?: string;
  [key: string]: any;
};

export const submitAssessmentResult = async (payload: BasePayload): Promise<{ success: boolean; error?: string }> => {
  if (!(await ensureFirebaseReady())) return { success: false, error: "Firebase Cloud services are unavailable." };
  try {
    const authenticated = await ensureAuthenticatedUser();
    if (!authenticated) throw new Error("Firebase Authentication is unavailable.");
    const docId = payload.idempotencyKey || safeRandomUUID();

    let metrics: Record<string, any> = {};
    if (payload.assessmentType === 'visual-reaction') {
        metrics = { averageReactionTime: payload.averageReactionTime, fastestReactionTime: payload.fastestReactionTime, slowestReactionTime: payload.slowestReactionTime, medianReactionTime: payload.medianReactionTime, consistency: payload.consistency, totalFalseStarts: payload.totalFalseStarts };
    } else if (payload.assessmentType === 'direction') {
        metrics = { averageReactionTime: payload.averageReactionTime, fastestReactionTime: payload.fastestReactionTime, slowestReactionTime: payload.slowestReactionTime, medianReactionTime: payload.medianReactionTime, accuracy: payload.accuracy, totalCorrect: payload.totalCorrect };
    } else if (payload.assessmentType === 'color-recognition') {
        metrics = { averageReactionTime: payload.averageReactionTime, fastestReactionTime: payload.fastestReactionTime, slowestReactionTime: payload.slowestReactionTime, medianReactionTime: payload.medianReactionTime, accuracy: payload.accuracy, correctCount: payload.correctCount };
    } else {
        metrics = { highestLevel: payload.highestLevel, longestSeq: payload.longestSeq, totalCorrect: payload.totalCorrect, totalAttempts: payload.totalAttempts, overallAccuracy: payload.overallAccuracy, totalTimeMs: payload.totalTimeMs };
    }

    let completedAtMonth, completedAtTimestamp, provenanceToken;
    try {
      const provRes = await fetch('/api/research/provenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentType: payload.assessmentType,
          ageGroup: payload.ageGroup,
          metrics,
          trials: payload.idempotencyKey ? getRawTrialObservations({ experimentId: payload.idempotencyKey }) : []
        })
      });
      if (!provRes.ok) throw new Error('Server provenance attestation rejected');
      const provData = await provRes.json();
      completedAtTimestamp = provData.completedAtTimestamp;
      completedAtMonth = provData.completedAtMonth;
      provenanceToken = provData.provenanceToken;
    } catch (provErr: any) { return { success: false, error: provErr?.message }; }

    const publicDatasetDoc = { ageGroup: payload.ageGroup, assessmentType: payload.assessmentType, schemaVersion: 1, completedAtMonth, completedAtTimestamp, provenanceToken, ...metrics };
    const docRef = doc(db, 'publicDataset', docId);

    if (payload.idempotencyKey) {
      try {
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) return { success: true };
      } catch (e) {}
    }

    await setDoc(docRef, publicDatasetDoc);
    await safeWaitForPendingWrites(db);
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
};

export type LeaderboardEntry = { id: string; displayName: string; assessmentType: AssessmentType; scoreMetric: number; ageGroup: string; createdAt?: any; source?: 'local' | 'cloud'; };
const LOCAL_LEADERBOARD_KEY = 'pulse_local_leaderboard_entries';

function getLocalLeaderboardEntries(type?: AssessmentType): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return type ? parsed.filter((e: any) => e.assessmentType === type) : parsed;
  } catch { return []; }
}

function saveLocalLeaderboardEntry(entry: LeaderboardEntry) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalLeaderboardEntries();
    const combined = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 500);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(combined));
  } catch {}
}

export const submitLeaderboardResult = async (payload: { displayName: string; assessmentType: AssessmentType; scoreMetric: number; ageGroup: string; idempotencyKey?: string; }): Promise<{ success: boolean; syncedToCloud: boolean; error?: string }> => {
  const docId = payload.idempotencyKey || safeRandomUUID();
  const localEntry: LeaderboardEntry = { id: docId, displayName: (payload.displayName || 'Anonymous').trim(), assessmentType: payload.assessmentType, scoreMetric: payload.scoreMetric, ageGroup: payload.ageGroup, createdAt: new Date().toISOString(), source: 'local' };
  saveLocalLeaderboardEntry(localEntry);

  if (!(await ensureFirebaseReady())) return { success: true, syncedToCloud: false };
  try {
    const authenticated = await ensureAuthenticatedUser();
    if (!authenticated) return { success: true, syncedToCloud: false, error: 'Authentication failed' };

    let provenanceToken;
    try {
      const provRes = await fetch('/api/leaderboard/provenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: payload.displayName.trim(),
          assessmentType: payload.assessmentType,
          scoreMetric: payload.scoreMetric,
          ageGroup: payload.ageGroup,
          trials: payload.idempotencyKey ? getRawTrialObservations({ experimentId: payload.idempotencyKey }) : []
        })
      });
      if (!provRes.ok) throw new Error('Leaderboard provenance attestation rejected');
      const provData = await provRes.json();
      provenanceToken = provData.provenanceToken;
    } catch (provErr: any) { return { success: true, syncedToCloud: false, error: provErr?.message }; }

    const docRef = doc(db!, 'leaderboardResults', docId);
    if (payload.idempotencyKey) {
      try { const existingDoc = await getDoc(docRef); if (existingDoc.exists()) return { success: true, syncedToCloud: true }; } catch (e) {}
    }

    await setDoc(docRef, { displayName: payload.displayName.trim(), assessmentType: payload.assessmentType, scoreMetric: payload.scoreMetric, ageGroup: payload.ageGroup, provenanceToken, hidden: false, createdAt: serverTimestamp() });
    await safeWaitForPendingWrites(db!);
    return { success: true, syncedToCloud: true };
  } catch (err: any) { return { success: true, syncedToCloud: false, error: err?.message }; }
};

export const getLeaderboardResults = async (assessmentType: AssessmentType): Promise<LeaderboardEntry[]> => {
  let cloudResults: LeaderboardEntry[] = [];
  if (isFirestoreAvailable() && db) {
    try {
      await ensureFirebaseReady();
      await ensureAuthenticatedUser().catch(() => {});
      const colRef = collection(db, 'leaderboardResults');
      const isSpeed = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      
      let snapshot;
      try {
        const q = isSpeed
          ? query(colRef, where('assessmentType', '==', assessmentType), where('hidden', '==', false), orderBy('scoreMetric', 'asc'), limit(100))
          : query(colRef, where('assessmentType', '==', assessmentType), where('hidden', '==', false), orderBy('scoreMetric', 'desc'), limit(100));
        snapshot = await getDocsFromServer(q);
      } catch (serverErr: any) {
        console.warn("Cloud leaderboard unreachable or rejected by rules:", serverErr);
      }

      if (snapshot) {
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data || data.hidden === true || data.assessmentType !== assessmentType) return;
          cloudResults.push({ id: docSnap.id, displayName: data.displayName || 'Anonymous', assessmentType: (data.assessmentType as AssessmentType) || assessmentType, scoreMetric: Number(data.scoreMetric) || 0, ageGroup: data.ageGroup || '', createdAt: data.createdAt, source: 'cloud' });
        });
      }
    } catch (err: any) { console.warn("Cloud leaderboard unreachable, utilizing local & benchmark pool:", err); }
  }

  const localEntries = getLocalLeaderboardEntries(assessmentType);
  const combinedMap = new Map<string, LeaderboardEntry>();
  localEntries.forEach(e => combinedMap.set(e.id, e));
  cloudResults.forEach(e => combinedMap.set(e.id, e));
  const results = Array.from(combinedMap.values());
  const isSpeed = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
  results.sort((a, b) => isSpeed ? a.scoreMetric - b.scoreMetric : b.scoreMetric - a.scoreMetric);
  return results.slice(0, 100);
};
`;

fs.writeFileSync('src/lib/firestore.ts', original);
fs.writeFileSync('mobile/src/lib/firestore.ts', original);
