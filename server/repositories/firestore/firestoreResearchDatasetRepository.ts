import type { Firestore, Query } from 'firebase-admin/firestore';
import type { IResearchDatasetRepository } from '../interfaces/IResearchDatasetRepository';
import type {
  DatasetQueryOptions,
  RawDatasetQueryResult,
  RawDatasetSummaryCounts,
  RawAssessmentResultRecord
} from '../../models/researchModels';
import { VALID_ASSESSMENT_TYPES } from '../../config/constants';

export class FirestoreResearchDatasetRepository implements IResearchDatasetRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async queryRawDataset(options: DatasetQueryOptions): Promise<RawDatasetQueryResult> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    let q: Query = db.collection('assessmentResults');

    if (options.assessmentType) {
      const aliases = options.assessmentType === 'color-recognition'
        ? ['color-recognition', 'colour-recognition', 'color-test', 'colour-test']
        : [options.assessmentType];

      if (aliases.length === 1) {
        q = q.where('assessmentType', '==', aliases[0]);
      } else {
        q = q.where('assessmentType', 'in', aliases);
      }
    }

    if (options.ageGroup) {
      q = q.where('ageGroup', '==', options.ageGroup);
    }

    if (options.completedAtMonth) {
      q = q.where('completedAtMonth', '==', options.completedAtMonth);
    }

    q = q.orderBy('__name__');

    if (options.cursor) {
      q = q.startAfter(options.cursor);
    }

    q = q.limit(options.limitCount + 1);

    const snap = await q.get();
    const hasMore = snap.docs.length > options.limitCount;
    const pageDocs = hasMore ? snap.docs.slice(0, options.limitCount) : snap.docs;
    const nextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : null;

    const sessionIds = pageDocs
      .map(docSnap => docSnap.data().sessionId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const sessionMap = new Map<string, Record<string, unknown>>();
    if (sessionIds.length > 0) {
      const sessionSnaps = await Promise.all(
        sessionIds.map(id => db.collection('experimentSessions').doc(id).get())
      );
      sessionSnaps.forEach(sSnap => {
        if (sSnap.exists) {
          sessionMap.set(sSnap.id, sSnap.data() as Record<string, unknown>);
        }
      });
    }

    const trialsBySession = new Map<string, Record<string, unknown>[]>();
    for (let i = 0; i < sessionIds.length; i += 30) {
      const chunk = sessionIds.slice(i, i + 30);
      const trialsSnap = await db.collection('assessmentTrials').where('sessionId', 'in', chunk).get();
      trialsSnap.docs.forEach(tDoc => {
        const tData = tDoc.data() as Record<string, unknown>;
        const sId = tData.sessionId as string | undefined;
        if (sId) {
          if (!trialsBySession.has(sId)) {
            trialsBySession.set(sId, []);
          }
          trialsBySession.get(sId)!.push(tData);
        }
      });
    }

    const results: RawAssessmentResultRecord[] = pageDocs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<RawAssessmentResultRecord, 'id'>)
    }));

    return {
      results,
      sessionMap,
      trialsBySession,
      hasMore,
      nextCursor
    };
  }

  async getDatasetSummary(): Promise<RawDatasetSummaryCounts> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const counts: Record<string, number> = {
      'visual-reaction': 0,
      'direction': 0,
      'color-recognition': 0,
      'block-memory': 0,
      'number-memory': 0
    };

    const [resultsCountSnap, trialsCountSnap, ...typeCountSnaps] = await Promise.all([
      db.collection('assessmentResults').count().get(),
      db.collection('assessmentTrials').count().get(),
      ...VALID_ASSESSMENT_TYPES.map(type =>
        db.collection('assessmentResults').where('assessmentType', '==', type).count().get()
      )
    ]);

    const totalRecords = resultsCountSnap.data().count;
    const totalTrials = trialsCountSnap.data().count;
    VALID_ASSESSMENT_TYPES.forEach((type, idx) => {
      counts[type] = typeCountSnaps[idx]?.data().count || 0;
    });

    return {
      totalRecords,
      totalTrials,
      counts
    };
  }
}
