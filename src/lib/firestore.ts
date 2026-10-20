import { getOrCreateDeviceId } from '@shared/telemetry/deviceId';
import { doc, setDoc, getDoc, waitForPendingWrites, serverTimestamp, collection, query, where, orderBy, getDocs, getDocsFromServer, limit, Firestore, Timestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getInMemorySessionTrials } from './inMemorySessionStore';
import { db, auth, isConfigured, authInitPromise } from './firebase';
import { reportError } from './errorReporter';
import { isOptedInLeaderboardUser, isValidLeaderboardScoreMetric, normalizeLeaderboardAssessmentType, safeLeaderboardDisplayNameForRead, validateLeaderboardDisplayName } from '../../shared/domain/leaderboardEligibility';
export { isOptedInLeaderboardUser };

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

    try {
      await signInAnonymously(auth);
      if (auth.currentUser) return true;
    } catch (_) {
      // Listener below will catch state transition if in-flight
    }

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
          resolve(Boolean(auth?.currentUser));
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
  source: 'cloud';
  hidden?: boolean;
  accuracy?: number | null;
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
  displayDelayOffsetEstimated?: boolean | null;
  displayDelayOffsetSource?: string | null;
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

let activeSessionTimer: any = null;

export function setServiceWorkerActiveSession(active: boolean): void {
  if (typeof window !== 'undefined') {
    (window as any).__PULSE_SESSION_ACTIVE__ = active;
    if (activeSessionTimer) {
      clearTimeout(activeSessionTimer);
      activeSessionTimer = null;
    }
    if (active) {
      // Auto-expire after 10 minutes to prevent permanent drift if an assessment is abandoned
      activeSessionTimer = setTimeout(() => {
        setServiceWorkerActiveSession(false);
      }, 10 * 60 * 1000);
    }
  }
  if (!active && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'PULSE_SESSIONS_COMPLETED' });
      }
    }).catch(() => {});
  }
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'QUERY_PULSE_SESSION_ACTIVE') {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          isSessionActive: Boolean(typeof window !== 'undefined' && (window as any).__PULSE_SESSION_ACTIVE__)
        });
      }
    }
  });
}

export const startExperimentSession = async (assessmentType: AssessmentType, ageGroup?: string): Promise<{
  success: boolean;
  sessionId?: string;
  expiresAt?: number;
  error?: string;
  status: number;
}> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'Internet connection required to initiate a calibrated assessment session. Please reconnect and retry.',
      status: 0
    };
  }

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

    setServiceWorkerActiveSession(true);

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
    const res = await fetchWithAuth('/api/research/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assessmentType: payload.assessmentType,
        ageGroup: payload.ageGroup,
        deviceCategory: 'mobile',
        trials,
        sessionId: activeSessionId,
        idempotencyKey: activeIdempotencyKey,
        deviceId: getOrCreateDeviceId()
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
  } finally {
    setServiceWorkerActiveSession(false);
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
        idempotencyKey: activeIdempotencyKey,
        deviceId: getOrCreateDeviceId()
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

    clearClientLeaderboardCache(payload.assessmentType);

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

export function normalizeAssessmentType(type: string): AssessmentType | null {
  return normalizeLeaderboardAssessmentType(type);
}

export type LeaderboardResponse = LeaderboardEntry[] & {
  entries: LeaderboardEntry[];
  fetchedAt: Date;
};

interface ClientLeaderboardCacheEntry {
  entries: LeaderboardEntry[];
  fetchedAt: Date;
  storedAt: number;
  generation: number;
}

interface ClientInFlightRequest {
  promise: Promise<LeaderboardResponse>;
  generation: number;
  isFresh: boolean;
}

const clientLeaderboardCache = new Map<string, ClientLeaderboardCacheEntry>();
const clientLeaderboardGenerations = new Map<string, number>();
const clientLeaderboardInFlight = new Map<string, ClientInFlightRequest>();
const CLIENT_LEADERBOARD_TTL_MS = 30_000;

function getClientGeneration(type: string): number {
  const current = clientLeaderboardGenerations.get(type);
  if (typeof current === 'number') return current;
  clientLeaderboardGenerations.set(type, 1);
  return 1;
}

function advanceClientGeneration(type: string): number {
  const next = getClientGeneration(type) + 1;
  clientLeaderboardGenerations.set(type, next);
  return next;
}

export function clearClientLeaderboardCache(assessmentType?: string | null): void {
  if (assessmentType && assessmentType !== 'all') {
    const normalized = normalizeAssessmentType(assessmentType);
    if (normalized) {
      advanceClientGeneration(normalized);
      clientLeaderboardCache.delete(normalized);
    }
  } else {
    for (const key of Object.keys(PROTOCOL_ALIASES)) {
      advanceClientGeneration(key);
      clientLeaderboardCache.delete(key);
    }
  }
}

function createLeaderboardResponse(entries: LeaderboardEntry[], fetchedAt: Date): LeaderboardResponse {
  const defensiveCopies = entries.map(e => ({ ...e }));
  return Object.assign(defensiveCopies, {
    entries: defensiveCopies,
    fetchedAt
  }) as LeaderboardResponse;
}

export const getLeaderboardResults = async (
  assessmentType: AssessmentType,
  options?: { bypassCache?: boolean }
): Promise<LeaderboardResponse> => {
  const canonicalType = normalizeAssessmentType(assessmentType);
  if (!canonicalType) return createLeaderboardResponse([], new Date());

  const isFresh = options?.bypassCache === true;
  const now = Date.now();

  // 1. Check in-memory client cache
  if (!isFresh) {
    const cached = clientLeaderboardCache.get(canonicalType);
    const currentGen = getClientGeneration(canonicalType);
    if (cached && cached.generation === currentGen && (now - cached.storedAt) < CLIENT_LEADERBOARD_TTL_MS) {
      return createLeaderboardResponse(cached.entries, cached.fetchedAt);
    }
  }

  // 2. Coalescing and generation reservation
  let requestGen: number;
  const activeInFlight = clientLeaderboardInFlight.get(canonicalType);

  if (isFresh) {
    if (activeInFlight && activeInFlight.isFresh && activeInFlight.generation === getClientGeneration(canonicalType)) {
      return await activeInFlight.promise;
    }
    requestGen = advanceClientGeneration(canonicalType);
  } else {
    if (activeInFlight && activeInFlight.generation === getClientGeneration(canonicalType)) {
      return await activeInFlight.promise;
    }
    requestGen = getClientGeneration(canonicalType);
  }

  // 3. Launch the request
  const requestPromise = (async () => {
    const isSpeed = canonicalType === 'visual-reaction' || canonicalType === 'direction' || canonicalType === 'color-recognition';
    const entriesMap = new Map<string, LeaderboardEntry>();
    let firestoreSucceeded = false;
    let apiSucceeded = false;
    let lastError: Error | null = null;
    let allAliasesSucceeded = false;

    // 1. Fetch from authoritative /api/leaderboard endpoint (strictly opt-in entries)
    try {
      const fetchUrl = isFresh
        ? `/api/leaderboard?assessmentType=${encodeURIComponent(canonicalType)}&fresh=1`
        : `/api/leaderboard?assessmentType=${encodeURIComponent(canonicalType)}`;
      const fetchOpts = isFresh ? { cache: 'no-store' as RequestCache } : undefined;
      const res = await fetch(fetchUrl, fetchOpts);
      if (res.status === 429) {
        const cached = clientLeaderboardCache.get(canonicalType);
        if (cached && cached.entries.length > 0) {
          const resp = createLeaderboardResponse(cached.entries, cached.fetchedAt);
          (resp as any).warning = 'Too many refresh requests. Showing latest cached standings — please try again shortly.';
          (resp as any).isRateLimited = true;
          return resp;
        }
        throw new Error('Too many refresh requests. Please retry shortly.');
      }
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && Array.isArray(payload.entries)) {
          apiSucceeded = true;
          allAliasesSucceeded = true;
          payload.entries.forEach((e: any) => {
            const name = String(e?.displayName || '').trim();
            const safeDisplayName = safeLeaderboardDisplayNameForRead(name);
            const normalizedType = normalizeAssessmentType(e?.assessmentType || canonicalType);
            if (
              normalizedType === canonicalType &&
              e && e.id &&
              typeof e.scoreMetric === 'number' &&
              isValidLeaderboardScoreMetric(canonicalType, e.scoreMetric) &&
              !entriesMap.has(e.id) &&
              safeDisplayName !== null
            ) {
              entriesMap.set(e.id, {
                id: e.id,
                displayName: safeDisplayName,
                assessmentType: normalizedType,
                scoreMetric: e.scoreMetric,
                ageGroup: String(e.ageGroup || ''),
                createdAt: e.createdAt,
                source: 'cloud',
                accuracy: typeof e.accuracy === 'number' ? e.accuracy : typeof e.derivedMetrics?.accuracy === 'number' ? e.derivedMetrics.accuracy : null
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
            let snapshot;
            try {
              const q = query(
                colRef,
                where('assessmentType', '==', alias),
                where('hidden', '==', false),
                orderBy('scoreMetric', aliasDirection),
                limit(100)
              );
              snapshot = await getDocsFromServer(q);
            } catch (indexErr: any) {
              // If the composite index including hidden==false has not been built in Firestore console yet,
              // fall back to the existing assessmentType + scoreMetric index and filter hidden in memory.
              const fallbackQuery = query(
                colRef,
                where('assessmentType', '==', alias),
                orderBy('scoreMetric', aliasDirection),
                limit(100)
              );
              snapshot = await getDocsFromServer(fallbackQuery);
            }
            querySuccessCount++;

            snapshot.docs.forEach(docSnap => {
              const data = docSnap.data();
              if (!data || data.hidden === true) return;

              if (typeof data.scoreMetric !== 'number') return;
              const score = data.scoreMetric;
              if (!isValidLeaderboardScoreMetric(canonicalType, score)) return;

              const displayName = String(data.displayName || '').trim();
              const safeDisplayName = safeLeaderboardDisplayNameForRead(displayName);
              if (safeDisplayName === null) return;

              const rawType = String(data.assessmentType || canonicalType);
              const normalizedType = normalizeAssessmentType(rawType);
              if (!normalizedType || normalizedType !== canonicalType) return;

              if (!entriesMap.has(docSnap.id)) {
                entriesMap.set(docSnap.id, {
                  id: docSnap.id,
                  displayName: safeDisplayName,
                  assessmentType: normalizedType,
                  scoreMetric: score,
                  ageGroup: String(data.ageGroup || ''),
                  createdAt: data.createdAt,
                  source: 'cloud',
                  accuracy: typeof data.accuracy === 'number' ? data.accuracy : typeof data.derivedMetrics?.accuracy === 'number' ? data.derivedMetrics.accuracy : null
                });
              }
            });
          } catch (qErr: any) {
            lastError = qErr instanceof Error ? qErr : new Error(String(qErr));
            console.warn('[Leaderboard] Direct Firestore alias query failed:', qErr?.message || qErr);
          }
        }

        if (querySuccessCount === aliases.length) {
          firestoreSucceeded = true;
          allAliasesSucceeded = true;
        } else if (querySuccessCount > 0) {
          firestoreSucceeded = true;
          allAliasesSucceeded = false;
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

  const topResults = results.slice(0, 100);
  const fetchedAt = new Date();

  // Cache in-memory ONLY if:
  // 1. Generation hasn't changed since request began
  // 2. Either API succeeded OR all direct Firestore aliases succeeded (no partial data caching)
  if (getClientGeneration(canonicalType) === requestGen && allAliasesSucceeded) {
    clientLeaderboardCache.set(canonicalType, {
      entries: topResults,
      fetchedAt,
      storedAt: Date.now(),
      generation: requestGen
    });
  }

  return createLeaderboardResponse(topResults, fetchedAt);
  })();

  const inFlightRecord: ClientInFlightRequest = {
    promise: requestPromise,
    generation: requestGen,
    isFresh
  };

  clientLeaderboardInFlight.set(canonicalType, inFlightRecord);

  try {
    return await requestPromise;
  } finally {
    if (clientLeaderboardInFlight.get(canonicalType) === inFlightRecord) {
      clientLeaderboardInFlight.delete(canonicalType);
    }
  }
};

export async function deleteMyLeaderboardEntries(assessmentType: string = 'all'): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const res = await fetchWithAuth(`/api/leaderboard/mine?assessmentType=${encodeURIComponent(assessmentType)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, deletedCount: 0, error: err.error || `Server returned ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    clearClientLeaderboardCache(assessmentType === 'all' ? undefined : assessmentType);
    return { success: true, deletedCount: typeof data.deletedCount === 'number' ? data.deletedCount : 0 };
  } catch (err: any) {
    return { success: false, deletedCount: 0, error: err?.message || 'Network error' };
  }
}

export async function getMyLeaderboardRank(assessmentType: string): Promise<{ success: boolean; rank: number | null; error?: string }> {
  try {
    const res = await fetchWithAuth(`/api/leaderboard/my-rank?assessmentType=${encodeURIComponent(assessmentType)}`, {
      method: 'GET'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, rank: null, error: err.error || `Server returned ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { success: true, rank: typeof data.rank === 'number' ? data.rank : null };
  } catch (err: any) {
    return { success: false, rank: null, error: err?.message || 'Network error' };
  }
}
