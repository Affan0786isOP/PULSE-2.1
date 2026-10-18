import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { FirestoreLeaderboardRepository } from '../../server/repositories/firestore/firestoreLeaderboardRepository';

describe('Admin Repository Invariants & Guarded Deletion Tests', () => {
  let store: Map<string, Record<string, unknown>>;
  let mockDb: any;
  let repo: FirestoreLeaderboardRepository;

  beforeEach(() => {
    store = new Map();

    mockDb = {
      collection: (colName: string) => ({
        doc: (id: string) => {
          const key = `${colName}/${id}`;
          return {
            id,
            get: async () => ({
              id,
              exists: store.has(key),
              data: () => store.get(key)
            })
          };
        }
      }),
      runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
        const tx = {
          get: async (refOrQuery: any) => {
            if (refOrQuery && typeof refOrQuery.get === 'function') {
              return refOrQuery.get();
            }
            return { exists: false, data: () => undefined };
          },
          update: (ref: any, data: Record<string, unknown>) => {
            const path = ref.id;
            for (const [k, v] of store.entries()) {
              if (k.endsWith(`/${path}`)) {
                store.set(k, { ...v, ...data });
                return;
              }
            }
          },
          set: (ref: any, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
            const path = ref.id;
            let targetKey = '';
            for (const k of store.keys()) {
              if (k.endsWith(`/${path}`)) targetKey = k;
            }
            if (!targetKey) targetKey = `unknown/${path}`;
            const existing = store.get(targetKey) || {};
            store.set(targetKey, opts?.merge ? { ...existing, ...data } : data);
          },
          delete: (ref: any) => {
            const path = ref.id;
            for (const k of Array.from(store.keys())) {
              if (k.endsWith(`/${path}`)) store.delete(k);
            }
          }
        };
        return updateFunction(tx);
      }
    };

    repo = new FirestoreLeaderboardRepository(() => mockDb);
  });

  it('guarded deleteEntry refuses to delete private-only submission receipts', async () => {
    const entryId = 'private-receipt-only';
    // Only store in leaderboardPrivateMeta, NOT in leaderboardResults
    store.set(`leaderboardPrivateMeta/${entryId}`, {
      ownerUid: 'user-1',
      assessmentType: 'visual-reaction',
      publicEntry: false,
      submissionReceiptOnly: true
    });

    const res = await repo.deleteEntry(entryId);
    expect(res.found).toBe(false);
    expect(store.has(`leaderboardPrivateMeta/${entryId}`)).toBe(true); // Receipt preserved!
  });

  it('deleteEntry permanently deletes entry when public row exists', async () => {
    const entryId = 'public-entry-1';
    store.set(`leaderboardResults/${entryId}`, {
      displayName: 'Alice',
      assessmentType: 'visual-reaction',
      scoreMetric: 200
    });
    store.set(`leaderboardPrivateMeta/${entryId}`, {
      ownerUid: 'user-1',
      assessmentType: 'visual-reaction',
      publicEntry: true
    });

    const res = await repo.deleteEntry(entryId);
    expect(res.found).toBe(true);
    expect(store.has(`leaderboardResults/${entryId}`)).toBe(false);
    expect(store.has(`leaderboardPrivateMeta/${entryId}`)).toBe(false);
  });

  it('softHideEntry aborts with OWNER_ERASURE_IN_PROGRESS if owner index deleting is true', async () => {
    const entryId = 'erasure-row-1';
    const ownerUid = 'user-erasure';
    const assessmentType = 'visual-reaction';
    const ownerIndexId = crypto.createHash('sha256').update(`${ownerUid}:${assessmentType}`).digest('hex');

    store.set(`leaderboardResults/${entryId}`, {
      displayName: 'Alice',
      assessmentType,
      scoreMetric: 200,
      hidden: false
    });
    store.set(`leaderboardPrivateMeta/${entryId}`, {
      ownerUid,
      assessmentType,
      publicEntry: true
    });
    store.set(`leaderboardOwnerIndex/${ownerIndexId}`, {
      deleting: true
    });

    await expect(repo.softHideEntry(entryId)).rejects.toThrow('OWNER_ERASURE_IN_PROGRESS');
  });

  it('updateEntryAlias aborts with OWNER_ERASURE_IN_PROGRESS if owner index deleting is true', async () => {
    const entryId = 'erasure-row-2';
    const ownerUid = 'user-erasure';
    const assessmentType = 'visual-reaction';
    const ownerIndexId = crypto.createHash('sha256').update(`${ownerUid}:${assessmentType}`).digest('hex');

    store.set(`leaderboardResults/${entryId}`, {
      displayName: 'Alice',
      assessmentType,
      scoreMetric: 200
    });
    store.set(`leaderboardPrivateMeta/${entryId}`, {
      ownerUid,
      assessmentType,
      publicEntry: true
    });
    store.set(`leaderboardOwnerIndex/${ownerIndexId}`, {
      deleting: true
    });

    await expect(repo.updateEntryAlias(entryId, 'NewAlice')).rejects.toThrow('OWNER_ERASURE_IN_PROGRESS');
  });
});
