import { db, auth, isConfigured } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import { 
  collection, 
  getDocsFromServer, 
  getCountFromServer,
  query, 
  where, 
  orderBy, 
  startAfter,
  limit as firestoreLimit, 
  QueryDocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';

import { getInMemorySessionTrials, recordInMemoryTrial } from './inMemorySessionStore';
import { deriveForeperiodCategory } from './protocolValidators';

export interface RawTrialObservation {
  id: string;
  participantId: string;
  experimentId: string;
  condition: string;
  test: string;
  trialNumber: number;
  trialIndex?: number;
  attemptNumber?: number;
  sequenceNumber?: number;
  stimulusTimestamp: number | null;
  responseTimestamp: number | null;
  stimulusWallTimestamp?: number | null;
  responseWallTimestamp?: number | null;
  stimulusScheduledAtPerfMs?: number | null;
  stimulusPresentedAtPerfMs?: number | null;
  responseDetectedAtPerfMs?: number | null;
  previousTrialEndedAtPerfMs?: number | null;
  stimulusScheduledAt?: number | null;
  stimulusPresentedAt?: number | null;
  responseDetectedAt?: number | null;
  previousTrialEndedAt?: number | null;
  reactionTime: number | null; 
  rawReactionTime?: number; 
  displayDelayOffsetMs?: number; 
  accuracy: number; 
  falseStart: boolean;
  timedOut?: boolean;
  valid?: boolean;
  foreperiodMs?: number;
  foreperiodCategory?: 'SHORT' | 'LONG';
  timestamp: string; 
  device: string;
  screenWidth: number | null;
  screenHeight: number | null;
  ageGroup?: string;
  notes?: string;
  [key: string]: unknown;
}

export function getParticipantId(): string {
  return auth?.currentUser?.uid || 'participant-server';
}

export function getDeviceDetails(): { device: string; screenWidth: number | null; screenHeight: number | null } {
  if (typeof window === 'undefined') {
    return { device: 'Server Environment', screenWidth: 1920, screenHeight: 1080 };
  }

  const rawW = typeof window.innerWidth === 'number' && Number.isFinite(window.innerWidth) && window.innerWidth > 0
    ? window.innerWidth
    : (window.screen?.width && window.screen.width > 0 ? window.screen.width : null);
  const rawH = typeof window.innerHeight === 'number' && Number.isFinite(window.innerHeight) && window.innerHeight > 0
    ? window.innerHeight
    : (window.screen?.height && window.screen.height > 0 ? window.screen.height : null);

  const screenWidth = typeof rawW === 'number' && Number.isFinite(rawW) && rawW > 0 ? rawW : null;
  const screenHeight = typeof rawH === 'number' && Number.isFinite(rawH) && rawH > 0 ? rawH : null;

  let deviceLabel = 'Web Client';
  try {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    let os = 'Unknown OS';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    deviceLabel = `${isMobile ? 'Mobile' : 'Desktop'} (${os} / ${browser})`;
  } catch {
    deviceLabel = 'Standard Web Browser';
  }

  return { device: deviceLabel, screenWidth, screenHeight };
}


const PENDING_SYNC_KEY = 'pulse_pending_sync_queue';

export function getRawTrialObservations(filter?: any): any[] { return []; }
export async function saveRawTrialObservation(data: any): Promise<any> { return data; }
export function resetPendingSyncQueue(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PENDING_SYNC_KEY);
      sessionStorage.removeItem(PENDING_SYNC_KEY);
    } catch {}
  }
}
export async function flushPendingTrialObservations(): Promise<void> {}
export async function fetchCloudTrialObservations(limitCount: number = 200): Promise<RawTrialObservation[]> {
  if (!isConfigured || !db) {
    throw new Error('Database service is not configured or offline.');
  }

  const ready = await ensureFirebaseReady();
  if (!ready) {
    throw new Error('Firebase service initialization failed.');
  }

  const authOk = await ensureAuthenticatedUser();
  if (!authOk || !auth?.currentUser) {
    throw new Error('Authentication failed - user login or anonymous session required.');
  }

  const colRef = collection(db, 'assessmentTrials');
  const uid = auth.currentUser.uid;
  const q = query(colRef, where('participantId', '==', uid), orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
  const snapshot = await getDocsFromServer(q);

  const cloudObservations: RawTrialObservation[] = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data) {
      cloudObservations.push({
        id: docSnap.id,
        participantId: data.participantId || 'unknown',
        experimentId: data.experimentId || 'unknown',
        condition: data.condition || 'standard',
        test: data.test || 'visual-reaction',
        trialNumber: data.trialNumber || 1,
        stimulusTimestamp: typeof data.stimulusTimestamp === 'number' ? data.stimulusTimestamp : null,
        responseTimestamp: typeof data.responseTimestamp === 'number' ? data.responseTimestamp : null,
        stimulusWallTimestamp: typeof data.stimulusWallTimestamp === 'number' ? data.stimulusWallTimestamp : null,
        responseWallTimestamp: typeof data.responseWallTimestamp === 'number' ? data.responseWallTimestamp : null,
        stimulusScheduledAtPerfMs: typeof data.stimulusScheduledAtPerfMs === 'number' ? data.stimulusScheduledAtPerfMs : (typeof data.stimulusScheduledAt === 'number' ? data.stimulusScheduledAt : null),
        stimulusPresentedAtPerfMs: typeof data.stimulusPresentedAtPerfMs === 'number' ? data.stimulusPresentedAtPerfMs : (typeof data.stimulusPresentedAt === 'number' ? data.stimulusPresentedAt : null),
        responseDetectedAtPerfMs: typeof data.responseDetectedAtPerfMs === 'number' ? data.responseDetectedAtPerfMs : (typeof data.responseDetectedAt === 'number' ? data.responseDetectedAt : null),
        previousTrialEndedAtPerfMs: typeof data.previousTrialEndedAtPerfMs === 'number' ? data.previousTrialEndedAtPerfMs : (typeof data.previousTrialEndedAt === 'number' ? data.previousTrialEndedAt : null),
        reactionTime: typeof data.reactionTime === 'number' ? data.reactionTime : null,
        rawReactionTime: data.rawReactionTime !== undefined ? Number(data.rawReactionTime) : undefined,
        displayDelayOffsetMs: data.displayDelayOffsetMs !== undefined ? Number(data.displayDelayOffsetMs) : undefined,
        timedOut: data.timedOut !== undefined ? Boolean(data.timedOut) : undefined,
        valid: data.valid !== undefined ? Boolean(data.valid) : undefined,
        foreperiodMs: data.foreperiodMs !== undefined ? Number(data.foreperiodMs) : undefined,
        foreperiodCategory: (data.foreperiodCategory === 'SHORT' || data.foreperiodCategory === 'LONG')
          ? data.foreperiodCategory
          : (data.foreperiodMs !== undefined ? (deriveForeperiodCategory(Number(data.foreperiodMs)) ?? undefined) : undefined),
        notes: data.notes !== undefined ? String(data.notes) : undefined,
        accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : 1,
        falseStart: Boolean(data.falseStart),
        timestamp: data.timestamp || new Date().toISOString(),
        device: data.device || 'Web Browser',
        screenWidth: typeof data.screenWidth === 'number' && Number.isFinite(data.screenWidth) && data.screenWidth > 0 ? Number(data.screenWidth) : null,
        screenHeight: typeof data.screenHeight === 'number' && Number.isFinite(data.screenHeight) && data.screenHeight > 0 ? Number(data.screenHeight) : null,
        ageGroup: data.ageGroup
      });
    }
  });

  return cloudObservations;
}

export async function fetchMyCloudTrialObservations(limitCount: number = 200): Promise<RawTrialObservation[]> {
  return fetchCloudTrialObservations(limitCount);
}

export type AssessmentSession = any;

/**
 * Fetch count of matching trial observations in Cloud Firestore
 */
export async function getCloudTrialsCount(filters: { test?: string; ageGroup?: string } = {}): Promise<number> {
  if (!isConfigured || !db) {
    throw new Error('Database service is not configured or offline.');
  }

  const ready = await ensureFirebaseReady();
  if (!ready) {
    throw new Error('Firebase service initialization failed.');
  }

  const authOk = await ensureAuthenticatedUser();
  if (!authOk || !auth?.currentUser) {
    throw new Error('Authentication is required to query trials.');
  }

  const tokenResult = await auth.currentUser.getIdTokenResult();
  const isAdmin = tokenResult.claims.role === 'admin';

  const colRef = collection(db, 'assessmentTrials');
  const constraints: QueryConstraint[] = [];

  if (!isAdmin) {
    constraints.push(where('participantId', '==', auth.currentUser.uid));
  }

  if (filters.test && filters.test !== 'All') {
    constraints.push(where('test', '==', filters.test));
  }
  if (filters.ageGroup && filters.ageGroup !== 'All') {
    constraints.push(where('ageGroup', '==', filters.ageGroup));
  }

  const q = query(colRef, ...constraints);
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/**
 * Paginated query for trial observations using Firestore cursors
 */
export async function fetchCloudTrialObservationsPaginated(
  pageSize: number = 50,
  startAfterDoc: QueryDocumentSnapshot | null = null,
  filters: { test?: string; ageGroup?: string } = {}
): Promise<{ observations: RawTrialObservation[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  if (!isConfigured || !db) {
    throw new Error('Database service is not configured or offline.');
  }

  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      throw new Error('Firebase service initialization failed.');
    }

    const authOk = await ensureAuthenticatedUser();
    if (!authOk || !auth?.currentUser) {
      throw new Error('Authentication is required to query trials.');
    }

    const tokenResult = await auth.currentUser.getIdTokenResult();
    const isAdmin = tokenResult.claims.role === 'admin';

    const colRef = collection(db, 'assessmentTrials');
    const constraints: QueryConstraint[] = [];

    if (!isAdmin) {
      constraints.push(where('participantId', '==', auth.currentUser.uid));
    }

    if (filters.test && filters.test !== 'All') {
      constraints.push(where('test', '==', filters.test));
    }
    if (filters.ageGroup && filters.ageGroup !== 'All') {
      constraints.push(where('ageGroup', '==', filters.ageGroup));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    // Request pageSize + 1 to check if hasMore
    constraints.push(firestoreLimit(pageSize + 1));

    const q = query(colRef, ...constraints);
    const snap = await getDocsFromServer(q);

    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const lastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null;

    const observations: RawTrialObservation[] = resultDocs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        participantId: data.participantId || 'unknown',
        experimentId: data.experimentId || 'unknown',
        condition: data.condition || 'standard',
        test: data.test || 'visual-reaction',
        trialNumber: Number(data.trialNumber) || 1,
        stimulusTimestamp: typeof data.stimulusTimestamp === 'number' ? data.stimulusTimestamp : null,
        responseTimestamp: typeof data.responseTimestamp === 'number' ? data.responseTimestamp : null,
        stimulusWallTimestamp: typeof data.stimulusWallTimestamp === 'number' ? data.stimulusWallTimestamp : null,
        responseWallTimestamp: typeof data.responseWallTimestamp === 'number' ? data.responseWallTimestamp : null,
        stimulusScheduledAtPerfMs: typeof data.stimulusScheduledAtPerfMs === 'number' ? data.stimulusScheduledAtPerfMs : (typeof data.stimulusScheduledAt === 'number' ? data.stimulusScheduledAt : null),
        stimulusPresentedAtPerfMs: typeof data.stimulusPresentedAtPerfMs === 'number' ? data.stimulusPresentedAtPerfMs : (typeof data.stimulusPresentedAt === 'number' ? data.stimulusPresentedAt : null),
        responseDetectedAtPerfMs: typeof data.responseDetectedAtPerfMs === 'number' ? data.responseDetectedAtPerfMs : (typeof data.responseDetectedAt === 'number' ? data.responseDetectedAt : null),
        previousTrialEndedAtPerfMs: typeof data.previousTrialEndedAtPerfMs === 'number' ? data.previousTrialEndedAtPerfMs : (typeof data.previousTrialEndedAt === 'number' ? data.previousTrialEndedAt : null),
        reactionTime: typeof data.reactionTime === 'number' ? data.reactionTime : null,
        rawReactionTime: data.rawReactionTime !== undefined ? Number(data.rawReactionTime) : undefined,
        displayDelayOffsetMs: data.displayDelayOffsetMs !== undefined ? Number(data.displayDelayOffsetMs) : undefined,
        accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : 1,
        falseStart: Boolean(data.falseStart),
        timedOut: data.timedOut !== undefined ? Boolean(data.timedOut) : undefined,
        valid: data.valid !== undefined ? Boolean(data.valid) : undefined,
        foreperiodMs: data.foreperiodMs !== undefined ? Number(data.foreperiodMs) : undefined,
        foreperiodCategory: (data.foreperiodCategory === 'SHORT' || data.foreperiodCategory === 'LONG')
          ? data.foreperiodCategory
          : (data.foreperiodMs !== undefined ? (deriveForeperiodCategory(Number(data.foreperiodMs)) ?? undefined) : undefined),
        timestamp: data.timestamp || new Date().toISOString(),
        device: data.device || 'Web Browser',
        screenWidth: typeof data.screenWidth === 'number' && Number.isFinite(data.screenWidth) && data.screenWidth > 0 ? Number(data.screenWidth) : null,
        screenHeight: typeof data.screenHeight === 'number' && Number.isFinite(data.screenHeight) && data.screenHeight > 0 ? Number(data.screenHeight) : null,
        ageGroup: data.ageGroup,
        notes: data.notes !== undefined ? String(data.notes) : undefined
      };
    });

    return { observations, lastDoc, hasMore };
  } catch (err) {
    console.error("Error fetching paginated cloud trials:", err);
    throw err;
  }
}

/**
 * Fetch all matching trial observations (chunked up to maxLimit)
 */
export async function fetchAllCloudTrialObservations(
  pageSize: number = 500,
  maxLimit: number = 2000,
  filters: { test?: string; ageGroup?: string } = {}
): Promise<RawTrialObservation[]> {
  const all: RawTrialObservation[] = [];
  let currentCursor: QueryDocumentSnapshot | null = null;
  let keepFetching = true;

  while (keepFetching && all.length < maxLimit) {
    const fetchSize = Math.min(pageSize, maxLimit - all.length);
    const pageResult = await fetchCloudTrialObservationsPaginated(fetchSize, currentCursor, filters);
    
    if (pageResult.observations.length === 0) {
      break;
    }

    all.push(...pageResult.observations);
    currentCursor = pageResult.lastDoc;
    keepFetching = pageResult.hasMore && Boolean(currentCursor);
  }

  return all;
}

