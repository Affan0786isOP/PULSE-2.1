import { db, auth, isConfigured } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import { 
  collection, 
  getDocsFromServer, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  QueryDocumentSnapshot,
  DocumentData
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
  screenWidth: number;
  screenHeight: number;
  ageGroup?: string;
  notes?: string;
  [key: string]: unknown;
}

export function getParticipantId(): string {
  return auth?.currentUser?.uid || 'participant-server';
}

export function getDeviceDetails(): { device: string; screenWidth: number; screenHeight: number } {
  if (typeof window === 'undefined') {
    return { device: 'Server Environment', screenWidth: 1920, screenHeight: 1080 };
  }

  const screenWidth = typeof window.innerWidth === 'number' ? window.innerWidth : (window.screen?.width || 0);
  const screenHeight = typeof window.innerHeight === 'number' ? window.innerHeight : (window.screen?.height || 0);

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


export function getRawTrialObservations(filter?: any): any[] { return []; }
export async function saveRawTrialObservation(data: any): Promise<any> { return data; }
export function resetPendingSyncQueue(): void {}
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
        stimulusTimestamp: typeof data.stimulusTimestamp === 'number' ? data.stimulusTimestamp : (data.stimulusTimestamp === null ? null : 0),
        responseTimestamp: typeof data.responseTimestamp === 'number' ? data.responseTimestamp : null,
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
        screenWidth: Number(data.screenWidth) || 0,
        screenHeight: Number(data.screenHeight) || 0,
        ageGroup: data.ageGroup
      });
    }
  });

  return cloudObservations;
}

export async function fetchMyCloudTrialObservations(limitCount: number = 200): Promise<RawTrialObservation[]> {
  return fetchCloudTrialObservations(limitCount);
}

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

export type AssessmentSession = any;

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

  const colRef = collection(db, 'assessmentTrials');
  const constraints: any[] = [];

  if (filters.test && filters.test !== 'All') {
    constraints.push(where('test', '==', filters.test));
  }
  if (filters.ageGroup && filters.ageGroup !== 'All') {
    constraints.push(where('ageGroup', '==', filters.ageGroup));
  }

  const q = query(colRef, ...constraints);
  const snap = await getDocsFromServer(q);
  return snap.size;
}

export async function fetchCloudTrialObservationsPaginated(
  pageSize: number = 50,
  startAfterDoc: QueryDocumentSnapshot | null = null,
  filters: { test?: string; ageGroup?: string } = {}
): Promise<{ observations: RawTrialObservation[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
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

  const colRef = collection(db, 'assessmentTrials');
  const constraints: any[] = [];

  if (filters.test && filters.test !== 'All') {
    constraints.push(where('test', '==', filters.test));
  }
  if (filters.ageGroup && filters.ageGroup !== 'All') {
    constraints.push(where('ageGroup', '==', filters.ageGroup));
  }

  constraints.push(orderBy('timestamp', 'desc'));

  if (startAfterDoc) {
    constraints.push(firestoreLimit(pageSize));
  } else {
    constraints.push(firestoreLimit(pageSize));
  }

  const q = query(colRef, ...constraints);
  const snap = await getDocsFromServer(q);

  const docs = snap.docs;
  const hasMore = docs.length >= pageSize;
  const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

  const observations: RawTrialObservation[] = docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      participantId: data.participantId || 'unknown',
      experimentId: data.experimentId || 'unknown',
      condition: data.condition || 'standard',
      test: data.test || 'visual-reaction',
      trialNumber: Number(data.trialNumber) || 1,
      stimulusTimestamp: typeof data.stimulusTimestamp === 'number' ? data.stimulusTimestamp : (data.stimulusTimestamp === null ? null : 0),
      responseTimestamp: typeof data.responseTimestamp === 'number' ? data.responseTimestamp : null,
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
      screenWidth: Number(data.screenWidth) || 0,
      screenHeight: Number(data.screenHeight) || 0,
      ageGroup: data.ageGroup,
      notes: data.notes !== undefined ? String(data.notes) : undefined
    };
  });

  return { observations, lastDoc, hasMore };
}
