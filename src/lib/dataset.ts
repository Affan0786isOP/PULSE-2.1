import { collection, query, limit as firestoreLimit, getDocsFromServer, getCountFromServer, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db, isConfigured } from './firebase';

export interface DatasetObservation {
  id: string;
  ageGroup: string;
  assessmentType: string;
  completedAtMonth: string;
  [key: string]: any; // metrics
}

export interface DatasetStats {
  totalObservations: number;
}

export const fetchDatasetObservations = async (
  filters: { assessmentType?: string; ageGroup?: string },
  observationLimit: number = 1000
): Promise<{ observations: DatasetObservation[], totalCount: number | null, error?: string }> => {
  if (!isConfigured || !db) {
    return { observations: [], totalCount: null, error: 'Database not configured or currently offline.' };
  }

  try {
    const datasetRef = collection(db, 'publicDataset');
    
    // 1. Build filter constraints
    const filterConstraints: QueryConstraint[] = [];
    if (filters.assessmentType && filters.assessmentType !== 'All') {
      filterConstraints.push(where('assessmentType', '==', filters.assessmentType));
    }
    if (filters.ageGroup && filters.ageGroup !== 'All') {
      filterConstraints.push(where('ageGroup', '==', filters.ageGroup));
    }
    
    const observationConstraints: QueryConstraint[] = [...filterConstraints, orderBy('completedAtTimestamp', 'desc'), firestoreLimit(observationLimit)];
    const observationQuery = query(datasetRef, ...observationConstraints);
    const countQuery = query(datasetRef, ...filterConstraints);

    // Fast count helper with timeout so count server query never stalls document loading
    const fetchCountWithTimeout = async (): Promise<number | null> => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const countPromise = getCountFromServer(countQuery).then(s => s.data().count);
        return await Promise.race([countPromise, timeoutPromise]);
      } catch {
        return null;
      }
    };

    // 2. Fetch observations directly from server and total count concurrently in parallel
    const [obsResult, countResult] = await Promise.allSettled([
      getDocsFromServer(observationQuery),
      fetchCountWithTimeout()
    ]);

    if (obsResult.status === 'rejected') {
      throw obsResult.reason;
    }

    const snapshot = obsResult.value;
    const observations: DatasetObservation[] = [];
    snapshot.forEach(doc => {
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
    console.warn("Dataset fetch failed:", rawMsg || error);
    return { observations: [], totalCount: null, error: uiMsg };
  }
};


