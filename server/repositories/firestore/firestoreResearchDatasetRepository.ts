import type { Firestore, Query } from 'firebase-admin/firestore';
import type { IResearchDatasetRepository } from '../interfaces/IResearchDatasetRepository';
import type {
  DatasetQueryOptions,
  RawDatasetQueryResult,
  RawDatasetSummaryCounts,
  RawPublicDatasetRecord
} from '../../models/researchModels';
import { normalizeLeaderboardAssessmentType } from '../../../shared/domain/leaderboardEligibility';

const DATASET_TYPE_ALIASES: Record<string, readonly string[]> = {
  'visual-reaction': ['visual-reaction', 'reaction-test', 'reaction', 'visual', 'visual-reaction-test'],
  direction: ['direction', 'direction-test', 'direction-reflex'],
  'color-recognition': ['color-recognition', 'colour-recognition', 'color-test', 'colour-test', 'color', 'colour', 'color-rec', 'colour-rec'],
  'block-memory': ['block-memory', 'block-memory-test', 'block'],
  'number-memory': ['number-memory', 'number-memory-test', 'number']
};

const SUMMARY_PAGE_SIZE = 500;

function getAssessmentTypeAliases(value: string): readonly string[] {
  const canonical = normalizeLeaderboardAssessmentType(value);
  return canonical ? DATASET_TYPE_ALIASES[canonical] : [value];
}

function isValidCursor(cursor: unknown): cursor is string {
  return typeof cursor === 'string' &&
    cursor.trim().length > 0 &&
    !cursor.includes('/') &&
    cursor.length <= 1500;
}

function finiteNonNegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function safeNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export class FirestoreResearchDatasetRepository implements IResearchDatasetRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async queryRawDataset(options: DatasetQueryOptions): Promise<RawDatasetQueryResult> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    if (!Number.isInteger(options.limitCount) || options.limitCount < 1 || options.limitCount > 250) {
      throw new Error('INVALID_LIMIT');
    }

    const rawCursor: unknown = options.cursor;
    if (rawCursor !== null && rawCursor !== undefined && !isValidCursor(rawCursor)) {
      throw new Error('INVALID_CURSOR');
    }
    const cursor = typeof rawCursor === 'string' ? rawCursor.trim() : null;

    // The public, anonymized collection is the source of truth for public research queries.
    let q: Query = db.collection('publicDataset');

    if (options.assessmentType) {
      const aliases = getAssessmentTypeAliases(options.assessmentType);
      q = aliases.length === 1
        ? q.where('assessmentType', '==', aliases[0])
        : q.where('assessmentType', 'in', [...aliases]);
    }

    if (options.ageGroup) q = q.where('ageGroup', '==', options.ageGroup);
    if (options.completedAtMonth) q = q.where('completedAtMonth', '==', options.completedAtMonth);

    q = q.orderBy('__name__');
    if (cursor) q = q.startAfter(cursor);
    q = q.limit(options.limitCount + 1);

    const snap = await q.get();
    const hasMore = snap.docs.length > options.limitCount;
    const pageDocs = hasMore ? snap.docs.slice(0, options.limitCount) : snap.docs;
    const results: RawPublicDatasetRecord[] = pageDocs.map(docSnap => ({
      ...(docSnap.data() as Record<string, unknown>),
      id: docSnap.id
    }));
    const nextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : null;

    return { results, hasMore, nextCursor };
  }

  async getDatasetSummary(): Promise<RawDatasetSummaryCounts> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const summarySnap = await db.collection('publicDatasetMeta').doc('summary').get();
    if (summarySnap.exists) {
      const summary = summarySnap.data() as Record<string, unknown>;
      if (summary.migrationInProgress === true) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }

      const totalRecords = safeNonNegativeInteger(summary.totalRecords);
      const totalTrials = safeNonNegativeInteger(summary.totalTrials);
      const rawCounts = summary.counts && typeof summary.counts === 'object'
        ? summary.counts as Record<string, unknown>
        : null;
      const canonicalTypes = [
        'visual-reaction',
        'direction',
        'color-recognition',
        'block-memory',
        'number-memory'
      ] as const;
      const normalizedCounts: Record<string, number> = {};
      for (const type of canonicalTypes) {
        const count = rawCounts ? safeNonNegativeInteger(rawCounts[type]) : null;
        if (count === null) throw new Error('DATASET_SUMMARY_RECONCILIATION_REQUIRED');
        normalizedCounts[type] = count;
      }

      if (
        summary.schemaVersion !== 1 ||
        totalRecords === null ||
        totalTrials === null
      ) {
        throw new Error('DATASET_SUMMARY_RECONCILIATION_REQUIRED');
      }

      return { totalRecords, totalTrials, counts: normalizedCounts };
    }

    // Compatibility path during rollout: before the one-time backfill creates
    // publicDatasetMeta/summary, preserve exact legacy summary semantics.
    const counts: Record<string, number> = {
      'visual-reaction': 0,
      direction: 0,
      'color-recognition': 0,
      'block-memory': 0,
      'number-memory': 0
    };

    let totalRecords = 0;
    let totalTrials = 0;
    let cursor: string | null = null;

    // Walk the public collection in bounded pages so legacy aliases and trial arrays
    // are counted consistently with the records exposed by the dataset endpoint.
    while (true) {
      let q: Query = db.collection('publicDataset').orderBy('__name__').limit(SUMMARY_PAGE_SIZE);
      if (cursor) q = q.startAfter(cursor);

      const snap = await q.get();
      if (snap.docs.length === 0) break;

      totalRecords += snap.docs.length;
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        const canonicalType = normalizeLeaderboardAssessmentType(data.assessmentType);
        if (canonicalType) counts[canonicalType] += 1;

        if (Array.isArray(data.progressionTrials)) {
          totalTrials += data.progressionTrials.length;
        } else {
          totalTrials += finiteNonNegative(data.totalTrials) ?? 0;
        }
      }

      if (snap.docs.length < SUMMARY_PAGE_SIZE) break;
      cursor = snap.docs[snap.docs.length - 1].id;
    }

    return { totalRecords, totalTrials, counts };
  }
}
