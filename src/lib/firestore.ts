import { doc, setDoc, getDoc, waitForPendingWrites, serverTimestamp, collection, query, where, orderBy, getDocs, getDocsFromServer, limit, Firestore, Timestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getInMemorySessionTrials } from './inMemorySessionStore';
import { db, auth, isConfigured, authInitPromise } from './firebase';
import { reportError } from './errorReporter';

export const isFirestoreAvailable = (): boolean => {
  return Boolean(isConfigured && db);
};

export const safeRandomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11);
};

export const safeWaitForPendingWrites = async (dbInstance: Firestore | null, timeoutMs = 3000): Promise<void> => {
  if (!dbInstance) return;
  try {
    await Promise.race([
      waitForPendingWrites(dbInstance),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  } catch (e) {
    reportError(e, 'EXPECTED_OPTIONAL_FAILURE', { component: 'Firestore', action: 'waitForPendingWrites' });
  }
};

export const ensureFirebaseReady = async (): Promise<boolean> => {
  if (!isConfigured || !db || !auth) return false;
  try {
    await authInitPromise;
    return true;
  } catch (err) {
    reportError(err, 'RECOVERABLE_FAILURE', { component: 'Firestore', action: 'ensureFirebaseReady' });
    return false;
  }
};

export const ensureAuthenticatedUser = async (): Promise<boolean> => {
  if (!isConfigured || !auth) return false;
  try {
    await authInitPromise;
    if (auth.currentUser) return true;

    return await new Promise<boolean>((resolve) => {
      let resolved = false;
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user && !resolved) {
          resolved = true;
          unsubscribe();
          resolve(true);
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(Boolean(auth.currentUser));
        }
      }, 5000);
    });
  } catch (error) {
    reportError(error, 'RECOVERABLE_FAILURE', { component: 'Firestore', action: 'ensureAuthenticatedUser' });
    return false;
  }
};

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const ready = await ensureFirebaseReady();
  if (!ready) throw new Error('Firebase service unavailable');
  
  const authOk = await ensureAuthenticatedUser();
  if (!authOk || !auth?.currentUser) throw new Error('Authentication required');

  let idToken = await auth.currentUser.getIdToken(false);
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('Authentication token unavailable');
  }

  const existingHeaders = (options.headers || {}) as Record<string, string>;
  const cleanHeaders = { ...existingHeaders };
  delete cleanHeaders['Authorization'];
  delete cleanHeaders['authorization'];

  const getHeaders = (token: string) => ({
    ...cleanHeaders,
    'Authorization': `Bearer ${token}`
  });

  let res = await fetch(url, { ...options, headers: getHeaders(idToken) });

  if (res.status === 401) {
    idToken = await auth.currentUser.getIdToken(true);
    if (idToken && typeof idToken === 'string' && idToken.trim()) {
      res = await fetch(url, { ...options, headers: getHeaders(idToken) });
    }
  }
  return res;
}

export const VALID_AGE_GROUPS = [
  'Children (8–12)', 'Adolescents (13–17)', 'Young adults (18–25)', 
  'Adults (26–40)', 'Middle-aged adults (41–60)', 'Older adults (61–75)', 'Seniors (76+)'
] as const;

export type AgeGroup = typeof VALID_AGE_GROUPS[number];

export type AssessmentType = 'visual-reaction' | 'direction' | 'color-recognition' | 'block-memory' | 'number-memory';

export type AssessmentMetrics = Record<string, number | string | boolean | undefined>;

export type VrtTrialValidity = 'VALID' | 'FALSE_START_PRE_STIMULUS' | 'ANTICIPATORY_TOO_FAST' | 'TIMEOUT';
export type VrtQualityFlag = 'ANTICIPATORY_RT' | 'TIMEOUT_EXCEEDED' | 'PREMATURE_TRIGGER' | null;

export type ForeperiodCategory = 'SHORT' | 'LONG';

export type VisualReactionResult = {
  validity: VrtTrialValidity;
  reactionTimeMs: number | null;
  foreperiodMs: number;
  foreperiodCategory: ForeperiodCategory;
  qualityFlag: VrtQualityFlag;
  timestamp: number;
};

export type DirectionResult = {
  reactionTimeMs: number;
  isCorrect: boolean;
  congruent: boolean;
  timestamp: number;
};

export type ColorRecognitionResult = {
  reactionTimeMs: number;
  isCorrect: boolean;
  congruent: boolean;
  timestamp: number;
};

export type BlockMemoryResult = {
  level: number;
  sequenceLength: number;
  isCorrect: boolean;
  timeTakenMs: number;
  timestamp: number;
};

export type NumberMemoryResult = {
  level: number;
  digits: number;
  isCorrect: boolean;
  timeTakenMs: number;
  timestamp: number;
};

export type LeaderboardEntry = {
  id: string;
  displayName: string;
  assessmentType: AssessmentType;
  scoreMetric: number;
  ageGroup: string;
  createdAt: any;
  source: 'cloud' | 'local';
  hidden?: boolean;
};

export type VrtTrialObservation = {
  trialIndex: number;
  attemptNumber: number;
  sequenceNumber: number;
  foreperiodMs: number;
  foreperiodCategory: ForeperiodCategory;
  stimulusScheduledAt: number;
  stimulusScheduledAtPerfMs: number;
  stimulusPresentedAt: number | null;
  stimulusPresentedAtPerfMs: number | null;
  responseDetectedAt: number;
  responseDetectedAtPerfMs: number;
  reactionTimeMs: number | null;
  reactionTime: number | null;
  rawLatencyMs: number | null;
  rawReactionTime: number | null;
  displayDelayOffsetMs: number | null;
  falseStart: boolean;
  timedOut: boolean;
  valid: boolean;
  validity: string;
  qualityFlag: string | null;
  previousTrialEndedAt: number | null;
  interStimulusIntervalMs: number | null;
  interTrialIntervalMs: number | null;
  stimulusWallTimestamp: number | null;
  stimulusTimestamp: number | null;
  responseWallTimestamp: number;
  responseTimestamp: number;
  timestamp: string;
  notes?: string;
  sessionId: string;
  experimentId: string;
  condition: string;
  test: string;
  trialNumber: number;
  accuracy: number;
  ageGroup?: string;
  [key: string]: any;
};

export type BasePayload = {
  assessmentType: AssessmentType;
  ageGroup: string;
  idempotencyKey?: string;
  trials?: any[];
  sessionId?: string;
  scoreMetric?: number;
  averageReactionTime?: number;
  highestLevel?: number;
  displayName?: string;
  [key: string]: any;
};

export const startExperimentSession = async (assessmentType: AssessmentType, ageGroup?: string): Promise<{
  success: boolean;
  sessionId?: string;
  expiresAt?: number;
  error?: string;
  status: number;
}> => {
  try {
    const res = await fetchWithAuth('/api/research/session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assessmentType,
        ageGroup: ageGroup || ''
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.error || `Server responded with status ${res.status}`;
      return {
        success: false,
        error: errorMessage,
        status: res.status
      };
    }

    if (!data.success || !data.sessionId) {
      return {
        success: false,
        error: data?.error || 'Failed to initialize experiment session',
        status: res.status
      };
    }

    return {
      success: true,
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
      status: 200
    };
  } catch (err: any) {
    reportError(err, 'RECOVERABLE_FAILURE', { component: 'Firestore', action: 'startExperimentSession' });
    return {
      success: false,
      error: err?.message || 'Network error initializing session',
      status: 500
    };
  }
};

export const submitAssessmentResult = async (payload: BasePayload): Promise<{ 
  success: boolean; 
  error?: string; 
  derivedMetrics?: any;
  scoreMetric?: number;
  isNewPersonalBest?: boolean;
  previousPersonalBest?: number | null;
  personalBest?: number | null;
}> => {
  try {
    const activeSessionId = payload.sessionId || payload.idempotencyKey;
    const activeIdempotencyKey = payload.idempotencyKey ? `${payload.idempotencyKey}-submit` : safeRandomUUID();
    const trials = payload.trials || getInMemorySessionTrials(activeSessionId || '');
    const isMobileClient = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const res = await fetchWithAuth('/api/research/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assessmentType: payload.assessmentType,
        ageGroup: payload.ageGroup,
        deviceCategory: isMobileClient ? 'mobile' : 'desktop',
        trials,
        sessionId: activeSessionId,
        idempotencyKey: activeIdempotencyKey
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server rejected submission (${res.status})`);
    }
    const resData = await res.json().catch(() => ({}));
    return { 
      success: true, 
      derivedMetrics: resData.derivedMetrics,
      scoreMetric: resData.scoreMetric,
      isNewPersonalBest: resData.isNewPersonalBest,
      previousPersonalBest: resData.previousPersonalBest,
      personalBest: resData.personalBest
    };
  } catch (err) {
    reportError(err, 'CRITICAL_FAILURE', { component: 'Firestore', action: 'submitAssessmentResult' });
    return { success: false, error: err instanceof Error ? err.message : 'Submission error' };
  }
};

export type PersonalBestResult = {
  success: boolean;
  value: number | null;
  error?: string;
};

export const getPersonalBest = async (
  assessmentType: AssessmentType, 
  isLowerBetter: boolean
): Promise<PersonalBestResult> => {
  try {
    const res = await fetchWithAuth(`/api/personal-best?assessmentType=${encodeURIComponent(assessmentType)}&isLowerBetter=${isLowerBetter}`);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.success) {
      return { success: true, value: data.personalBest };
    }
    return { success: false, value: null, error: data.error };
  } catch (err: any) {
    return { success: false, value: null, error: err.message };
  }
};

export const submitLeaderboardResult = async (payload: BasePayload & { trials?: any[], scoreMetric: number, displayName: string }): Promise<{success: boolean, syncedToCloud: boolean, error?: string}> => {
  try {
    const uid = auth?.currentUser?.uid;
    const activeSessionId = payload.sessionId || payload.idempotencyKey;
    const activeIdempotencyKey = payload.idempotencyKey ? `${payload.idempotencyKey}-leaderboard` : safeRandomUUID();
    const trials = payload.trials || getInMemorySessionTrials(activeSessionId || '');
    const res = await fetchWithAuth('/api/leaderboard/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: payload.displayName.trim(),
        assessmentType: payload.assessmentType,
        ageGroup: payload.ageGroup,
        scoreMetric: payload.scoreMetric,
        trials,
        userId: uid,
        sessionId: activeSessionId,
        idempotencyKey: activeIdempotencyKey
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server rejected leaderboard submission (${res.status})`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Leaderboard submission failed');
    }

    return { success: true, syncedToCloud: true };
  } catch (err) {
    reportError(err, 'RECOVERABLE_FAILURE', { component: 'Firestore', action: 'submitLeaderboardResult' });
    return { success: false, syncedToCloud: false, error: err instanceof Error ? err.message : 'Submission error' };
  }
};

const PROTOCOL_ALIASES: Record<AssessmentType, string[]> = {
  'visual-reaction': ['visual-reaction', 'reaction-test'],
  'direction': ['direction', 'direction-test'],
  'color-recognition': ['color-recognition', 'colour-recognition', 'color-test'],
  'block-memory': ['block-memory'],
  'number-memory': ['number-memory']
};

export function normalizeAssessmentType(type: string): AssessmentType {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'reaction-test' || t === 'visual-reaction') return 'visual-reaction';
  if (t === 'direction-test' || t === 'direction') return 'direction';
  if (t === 'colour-recognition' || t === 'color-test' || t === 'color-recognition') return 'color-recognition';
  if (t === 'block-memory') return 'block-memory';
  if (t === 'number-memory') return 'number-memory';
  return 'visual-reaction';
}

export function isOptedInLeaderboardUser(displayName: string | null | undefined): boolean {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'anonymous' || lower === 'unknown' || lower === 'guest') return false;
  if (lower.startsWith('participant')) return false;
  return true;
}

export const getLeaderboardResults = async (assessmentType: AssessmentType): Promise<LeaderboardEntry[]> => {
  const canonicalType = normalizeAssessmentType(assessmentType);
  const isSpeed = canonicalType === 'visual-reaction' || canonicalType === 'direction' || canonicalType === 'color-recognition';
  const entriesMap = new Map<string, LeaderboardEntry>();
  let firestoreAttempted = false;
  let firestoreSucceeded = false;
  let apiSucceeded = false;
  let lastError: Error | null = null;

  // 1. Fetch from authoritative /api/leaderboard endpoint (strictly opt-in entries)
  try {
    const res = await fetch(`/api/leaderboard?assessmentType=${encodeURIComponent(canonicalType)}`);
    if (res.ok) {
      const payload = await res.json();
      if (payload.success && Array.isArray(payload.entries)) {
        if (payload.entries.length > 0) apiSucceeded = true;
        payload.entries.forEach((e: any) => {
          const name = String(e?.displayName || '').trim();
          if (e && e.id && !entriesMap.has(e.id) && isOptedInLeaderboardUser(name)) {
            entriesMap.set(e.id, {
              id: e.id,
              displayName: name,
              assessmentType: normalizeAssessmentType(e.assessmentType || canonicalType),
              scoreMetric: Number(e.scoreMetric),
              ageGroup: String(e.ageGroup || ''),
              createdAt: e.createdAt,
              source: 'cloud'
            });
          }
        });
      } else {
        lastError = new Error(payload.error || 'Server leaderboard retrieval failed');
      }
    } else {
      lastError = new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (apiErr: any) {
    if (!lastError) lastError = apiErr instanceof Error ? apiErr : new Error(String(apiErr));
    console.warn('[Leaderboard] API query notice:', apiErr?.message || apiErr);
  }

  // 2. Direct Firestore query for opted-in leaderboard submissions from leaderboardResults
  if (!apiSucceeded && isFirestoreAvailable() && db) {
    firestoreAttempted = true;
    try {
      const ready = await ensureFirebaseReady();
      if (ready) {
        await ensureAuthenticatedUser();
        const aliases = PROTOCOL_ALIASES[canonicalType] || [canonicalType];
        const colRef = collection(db, 'leaderboardResults');
        let querySuccessCount = 0;

        for (const alias of aliases) {
          const aliasIsSpeed = alias === 'visual-reaction' || alias === 'direction' || alias === 'color-recognition' || alias === 'colour-recognition' || alias === 'color-test';
          const aliasDirection: 'asc' | 'desc' = aliasIsSpeed ? 'asc' : 'desc';

          try {
            const q = query(
              colRef,
              where('assessmentType', '==', alias),
              orderBy('scoreMetric', aliasDirection),
              limit(100)
            );
            const snapshot = await getDocsFromServer(q);
            querySuccessCount++;

            snapshot.docs.forEach(docSnap => {
              const data = docSnap.data();
              if (!data || data.hidden === true) return;

              const score = Number(data.scoreMetric);
              if (isNaN(score) || score <= 0) return;

              const displayName = String(data.displayName || '').trim();
              if (!isOptedInLeaderboardUser(displayName)) return;

              const rawType = String(data.assessmentType || canonicalType);
              const normalizedType = normalizeAssessmentType(rawType);

              if (!entriesMap.has(docSnap.id)) {
                entriesMap.set(docSnap.id, {
                  id: docSnap.id,
                  displayName,
                  assessmentType: normalizedType,
                  scoreMetric: score,
                  ageGroup: String(data.ageGroup || ''),
                  createdAt: data.createdAt,
                  source: 'cloud'
                });
              }
            });
          } catch (qErr: any) {
            lastError = qErr instanceof Error ? qErr : new Error(String(qErr));
            // Fallback without compound hidden filter if index is not ready
            try {
              const fallbackQ = query(
                colRef,
                where('assessmentType', '==', alias),
                orderBy('scoreMetric', aliasDirection),
                limit(100)
              );
              const snapshot = await getDocsFromServer(fallbackQ);
              querySuccessCount++;

              snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (!data || data.hidden === true) return;

                const score = Number(data.scoreMetric);
                if (isNaN(score) || score <= 0) return;

                const displayName = String(data.displayName || '').trim();
                if (!isOptedInLeaderboardUser(displayName)) return;

                const rawType = String(data.assessmentType || canonicalType);
                const normalizedType = normalizeAssessmentType(rawType);

                if (!entriesMap.has(docSnap.id)) {
                  entriesMap.set(docSnap.id, {
                    id: docSnap.id,
                    displayName,
                    assessmentType: normalizedType,
                    scoreMetric: score,
                    ageGroup: String(data.ageGroup || ''),
                    createdAt: data.createdAt,
                    source: 'cloud'
                  });
                }
              });
            } catch (fallbackErr: any) {
              lastError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
              // Tertiary fallback: simple equality query without orderBy (in-memory sorting prevents composite index failure)
              try {
                const simpleQ = query(
                  colRef,
                  where('assessmentType', '==', alias),
                  limit(100)
                );
                const snapshot = await getDocsFromServer(simpleQ);
                querySuccessCount++;

                snapshot.docs.forEach(docSnap => {
                  const data = docSnap.data();
                  if (!data || data.hidden === true) return;

                  const score = Number(data.scoreMetric);
                  if (isNaN(score) || score <= 0) return;

                  const displayName = String(data.displayName || '').trim();
                  if (!isOptedInLeaderboardUser(displayName)) return;

                  const rawType = String(data.assessmentType || canonicalType);
                  const normalizedType = normalizeAssessmentType(rawType);

                  if (!entriesMap.has(docSnap.id)) {
                    entriesMap.set(docSnap.id, {
                      id: docSnap.id,
                      displayName,
                      assessmentType: normalizedType,
                      scoreMetric: score,
                      ageGroup: String(data.ageGroup || ''),
                      createdAt: data.createdAt,
                      source: 'cloud'
                    });
                  }
                });
              } catch (simpleErr: any) {
                lastError = simpleErr instanceof Error ? simpleErr : new Error(String(simpleErr));
              }
            }
          }
        }

        if (querySuccessCount > 0) {
          firestoreSucceeded = true;
        }
      }
    } catch (fsErr: any) {
      lastError = fsErr instanceof Error ? fsErr : new Error(String(fsErr));
      console.warn('[Leaderboard] Firestore query notice:', fsErr?.message || fsErr);
    }
  }

  // If neither API nor direct Firestore query succeeded, throw an error
  if (!apiSucceeded && !firestoreSucceeded) {
    throw (lastError || new Error("Unable to load leaderboard data."));
  }

  const results = Array.from(entriesMap.values());

  results.sort((a, b) => {
    if (isSpeed) {
      if (a.scoreMetric !== b.scoreMetric) return a.scoreMetric - b.scoreMetric;
    } else {
      if (a.scoreMetric !== b.scoreMetric) return b.scoreMetric - a.scoreMetric;
    }
    const getMillis = (val: string | Timestamp | number | undefined): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num)) return num;
        const parsed = Date.parse(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      if (typeof val === 'object' && val !== null && 'toMillis' in val) {
        return (val as Timestamp).toMillis();
      }
      return 0;
    };
    const aTime = getMillis(a.createdAt);
    const bTime = getMillis(b.createdAt);
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });

  return results.slice(0, 100);
};
