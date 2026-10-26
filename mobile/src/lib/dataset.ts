import { collection, query, limit as firestoreLimit, getDocsFromServer, getCountFromServer, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db, isConfigured } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import type { RawTrialObservation } from './trialStore';

export interface DatasetObservation {
  id: string;
  ageGroup: string;
  assessmentType: string;
  completedAtMonth: string;
  completedAtTimestamp?: number;
  device?: string;
  deviceCategory?: string;
  progressionTrials?: any[];
  averageReactionTime?: number;
  medianReactionTime?: number;
  fastestReactionTime?: number;
  standardDeviation?: number;
  totalFalseStarts?: number;
  totalTrials?: number;
  errorRate?: number;
  [key: string]: any; // metrics
}

export interface DatasetStats {
  totalObservations: number;
}

/**
 * Unrolls granular trial observations from canonical Firestore publicDataset progressionTrials.
 * Treats Firestore publicDataset records as the authoritative single source of truth.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string
): RawTrialObservation[] {
  const unrolled: RawTrialObservation[] = [];

  datasetDocs.forEach((doc) => {
    if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) {
      return;
    }

    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    trials.forEach((pt: any, idx: number) => {
      const rt = typeof pt.reactionTime === 'number'
        ? pt.reactionTime
        : (typeof pt.rawLatencyMs === 'number'
          ? pt.rawLatencyMs
          : (typeof pt.inputLatencyMs === 'number' ? pt.inputLatencyMs : 0));

      const isCorrect = typeof pt.correct === 'boolean'
        ? pt.correct
        : (pt.accuracy === 1 || pt.accuracy === 100);

      const targetDir = pt.targetDirection
        ? String(pt.targetDirection).toUpperCase()
        : (pt.condition ? String(pt.condition).replace('arrow-', '').toUpperCase() : '');

      unrolled.push({
        id: `${doc.id}-tr-${pt.trialNumber || idx + 1}`,
        participantId: doc.participantId || doc.id,
        experimentId: doc.experimentId || doc.id,
        condition: targetDir ? `arrow-${targetDir.toLowerCase()}` : (pt.condition || 'standard'),
        test: doc.assessmentType || selectedGameId || 'visual-reaction',
        trialNumber: pt.trialNumber || idx + 1,
        stimulusTimestamp: pt.stimulusPresentedAtPerfMs || 0,
        responseTimestamp: pt.responseDetectedAtPerfMs || 0,
        reactionTime: rt,
        accuracy: isCorrect ? 1 : (pt.valid === false ? 0 : 1),
        falseStart: Boolean(pt.falseStart),
        timestamp: doc.completedAtMonth || new Date().toISOString(),
        device: doc.deviceCategory || doc.device || 'Web Browser',
        screenWidth: typeof doc.screenWidth === 'number' ? doc.screenWidth : 1440,
        screenHeight: typeof doc.screenHeight === 'number' ? doc.screenHeight : 900,
        ageGroup: doc.ageGroup,
        foreperiodMs: pt.foreperiodMs
      });
    });
  });

  return unrolled;
}

export const fetchDatasetObservations = async (
  filters: { assessmentType?: string; ageGroup?: string },
  observationLimit: number = 1000
): Promise<{ observations: DatasetObservation[]; totalCount: number | null; error?: string }> => {
  if (!isConfigured || !db) {
    return { observations: [], totalCount: null, error: 'Database not configured or currently offline.' };
  }

  try {
    await ensureFirebaseReady();
    await ensureAuthenticatedUser().catch(() => {});

    const datasetRef = collection(db, 'publicDataset');

    // 1. Build filter constraints
    const filterConstraints: QueryConstraint[] = [];
    if (filters.assessmentType && filters.assessmentType !== 'All') {
      filterConstraints.push(where('assessmentType', '==', filters.assessmentType));
    }
    if (filters.ageGroup && filters.ageGroup !== 'All') {
      filterConstraints.push(where('ageGroup', '==', filters.ageGroup));
    }

    const observationConstraints: QueryConstraint[] = [
      ...filterConstraints,
      orderBy('completedAtTimestamp', 'desc'),
      firestoreLimit(observationLimit)
    ];
    const observationQuery = query(datasetRef, ...observationConstraints);
    const countQuery = query(datasetRef, ...filterConstraints);

    // Fast count helper with timeout so count server query never stalls document loading
    const fetchCountWithTimeout = async (): Promise<number | null> => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const countPromise = getCountFromServer(countQuery).then((s) => s.data().count);
        return await Promise.race([countPromise, timeoutPromise]);
      } catch {
        return null;
      }
    };

    // 2. Fetch observations directly from server and total count concurrently in parallel
    // Gracefully fallback to un-ordered query if completedAtTimestamp composite index is pending
    const fetchDocsSafe = async () => {
      try {
        return await getDocsFromServer(observationQuery);
      } catch {
        const fallbackQuery = query(datasetRef, ...filterConstraints, firestoreLimit(observationLimit));
        return await getDocsFromServer(fallbackQuery);
      }
    };

    const [obsResult, countResult] = await Promise.allSettled([
      fetchDocsSafe(),
      fetchCountWithTimeout()
    ]);

    if (obsResult.status === 'rejected') {
      throw obsResult.reason;
    }

    const snapshot = obsResult.value;
    const observations: DatasetObservation[] = [];
    snapshot.forEach((doc) => {
      observations.push({ id: doc.id, ...doc.data() } as DatasetObservation);
    });

    const totalCount = countResult.status === 'fulfilled' ? countResult.value : null;

    return { observations, totalCount };
  } catch (error: any) {
    const rawMsg = error?.message || '';
    let uiMsg = rawMsg || 'Failed to fetch dataset';
    if (rawMsg.includes('may exist in the local cache')) {
      uiMsg = 'Cloud database is unreachable. (Local caching is strictly disabled by application policy.)';
    }
    console.warn('Dataset fetch failed:', rawMsg || error);
    return { observations: [], totalCount: null, error: uiMsg };
  }
};
