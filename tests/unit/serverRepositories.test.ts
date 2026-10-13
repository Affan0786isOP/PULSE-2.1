import { describe, it, expect } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreSessionRepository } from '../../server/repositories/firestore/firestoreSessionRepository';
import { FirestoreResearchDatasetRepository } from '../../server/repositories/firestore/firestoreResearchDatasetRepository';
import { FirestoreLeaderboardRepository } from '../../server/repositories/firestore/firestoreLeaderboardRepository';
import { FirestoreAdminAuditRepository } from '../../server/repositories/firestore/firestoreAdminAuditRepository';

// Mock in-memory Firestore double for unit testing repositories
function createMockDb(): Firestore {
  const store = new Map<string, Map<string, Record<string, unknown>>>();

  const getCol = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };

  const db = {
    collection(name: string) {
      const col = getCol(name);
      return {
        doc(id: string) {
          return {
            id,
            async get() {
              const data = col.get(id);
              return {
                id,
                exists: !!data,
                data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined)
              };
            },
            async set(data: Record<string, unknown>) {
              col.set(id, JSON.parse(JSON.stringify(data)));
            },
            async update(data: Record<string, unknown>) {
              const existing = col.get(id);
              if (!existing) throw new Error('NOT_FOUND');
              col.set(id, { ...existing, ...JSON.parse(JSON.stringify(data)) });
            },
            async delete() {
              col.delete(id);
            }
          };
        },
        where(field: string, op: string, val: unknown) {
          const filters: Array<{ field: string; op: string; value: unknown }> = [
            { field, op, value: val }
          ];
          let orderField: string | undefined;
          let orderDirection: string = 'asc';
          let maxResults = Number.POSITIVE_INFINITY;
          let cursorId: string | undefined;

          const query: {
            where(field: string, op: string, value: unknown): typeof query;
            orderBy(field: string, direction?: string): typeof query;
            limit(count: number): typeof query;
            startAfter(cursor: unknown): typeof query;
            get(): Promise<{
              docs: Array<{ id: string; data: () => Record<string, unknown> }>;
              size: number;
              empty: boolean;
            }>;
          } = {
            where(nextField: string, nextOp: string, nextValue: unknown) {
              filters.push({ field: nextField, op: nextOp, value: nextValue });
              return query;
            },
            orderBy(nextField: string, direction = 'asc') {
              orderField = nextField;
              orderDirection = direction;
              return query;
            },
            limit(count: number) {
              maxResults = Math.max(0, Math.floor(count));
              return query;
            },
            startAfter(cursor: unknown) {
              const maybeSnapshot = cursor as { id?: unknown } | null;
              cursorId = typeof maybeSnapshot?.id === 'string' ? maybeSnapshot.id : undefined;
              return query;
            },
            async get() {
              let matchingRows = Array.from(col.entries()).filter(([, data]) =>
                filters.every(filter => {
                  const actual = data[filter.field];
                  switch (filter.op) {
                    case '==': return actual === filter.value;
                    case '!=': return actual !== filter.value;
                    case '<': return typeof actual === 'number' && typeof filter.value === 'number' && actual < filter.value;
                    case '<=': return typeof actual === 'number' && typeof filter.value === 'number' && actual <= filter.value;
                    case '>': return typeof actual === 'number' && typeof filter.value === 'number' && actual > filter.value;
                    case '>=': return typeof actual === 'number' && typeof filter.value === 'number' && actual >= filter.value;
                    default: return false;
                  }
                })
              );

              if (orderField) {
                const fieldToSort = orderField;
                matchingRows.sort((left, right) => {
                  const leftValue = left[1][fieldToSort];
                  const rightValue = right[1][fieldToSort];
                  let comparison = 0;

                  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
                    comparison = leftValue - rightValue;
                  } else {
                    comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
                  }

                  return orderDirection === 'desc' ? -comparison : comparison;
                });
              }

              if (cursorId) {
                const cursorIndex = matchingRows.findIndex(([id]) => id === cursorId);
                if (cursorIndex >= 0) matchingRows = matchingRows.slice(cursorIndex + 1);
              }

              const docs = matchingRows.slice(0, maxResults).map(([id, data]) => ({
                id,
                data: () => JSON.parse(JSON.stringify(data)) as Record<string, unknown>
              }));
              return { docs, size: docs.length, empty: docs.length === 0 };
            }
          };
          return query;
        },
        orderBy(field: string, dir = 'asc') {
          return {
            limit(n: number) {
              return {
                async get() {
                  const arr = Array.from(col.entries()).map(([id, data]) => ({
                    id,
                    data: () => JSON.parse(JSON.stringify(data)) as Record<string, unknown>
                  }));
                  arr.sort((a, b) => {
                    const valA = (a.data() as Record<string, unknown>)[field];
                    const valB = (b.data() as Record<string, unknown>)[field];
                    let comparison = 0;
                    if (typeof valA === 'number' && typeof valB === 'number') {
                      comparison = valA - valB;
                    } else {
                      comparison = String(valA ?? '').localeCompare(String(valB ?? ''));
                    }
                    return dir === 'desc' ? -comparison : comparison;
                  });
                  const docs = arr.slice(0, n);
                  return { docs, size: docs.length, empty: docs.length === 0 };
                }
              };
            }
          };
        },
        async add(data: Record<string, unknown>) {
          const id = `auto-${Date.now()}`;
          col.set(id, JSON.parse(JSON.stringify(data)));
          return { id };
        },
        count() {
          return {
            async get() {
              return { data: () => ({ count: col.size }) };
            }
          };
        }
      };
    }
  };

  (db as any).runTransaction = async (updateFunction: (tx: any) => Promise<unknown>) => {
    const tx = {
      get: (ref: any) => ref.get(),
      set: (ref: any, data: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(data, options),
      update: (ref: any, data: Record<string, unknown>) => ref.update(data),
      delete: (ref: any) => ref.delete()
    };
    return updateFunction(tx);
  };

  const rawDb: unknown = db;
  return rawDb as Firestore;
}

describe('Firestore Repositories Unit Tests', () => {
  it('SessionRepository creates and retrieves session', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreSessionRepository(() => mockDb);

    await repo.create({
      sessionId: 'sess-unit-1',
      uid: 'user-unit',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      createdAt: 1700000000000,
      expiresAt: 1700000900000,
      consumed: false
    });

    const session = await repo.findById('sess-unit-1');
    expect(session).not.toBeNull();
    expect(session?.sessionId).toBe('sess-unit-1');
    expect(session?.uid).toBe('user-unit');
    expect(session?.consumed).toBe(false);

    const missing = await repo.findById('sess-nonexistent');
    expect(missing).toBeNull();
  });

  it('LeaderboardRepository retrieves and soft-hides entries', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreLeaderboardRepository(() => mockDb);

    mockDb.collection('leaderboardResults').doc('lb-1').set({
      displayName: 'Speedy',
      assessmentType: 'visual-reaction',
      scoreMetric: 200,
      hidden: false
    });

    const entries = await repo.getEntriesByAlias('visual-reaction', 'asc', 10);
    expect(entries.length).toBe(1);
    expect(entries[0].displayName).toBe('Speedy');

    const hideResult = await repo.softHideEntry('lb-1', 'Rule violation');
    expect(hideResult.success).toBe(true);
    expect(hideResult.found).toBe(true);

    const docAfter = await mockDb.collection('leaderboardResults').doc('lb-1').get();
    expect(docAfter.data().hidden).toBe(true);
    // Moderation reasons are private metadata and must not be exposed on the public row.
    expect(docAfter.data().hideReason).not.toBe('Rule violation');

    const privateMeta = await mockDb.collection('leaderboardPrivateMeta').doc('lb-1').get();
    expect(privateMeta.data().hideReason).toBe('Rule violation');
  });

  it('normalizes legacy assessment aliases and rejects corrupt leaderboard metrics', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreLeaderboardRepository(() => mockDb);
    const col = mockDb.collection('leaderboardResults');

    await col.doc('legacy-valid').set({
      displayName: 'Legacy Player',
      assessmentType: 'reaction-test',
      scoreMetric: 215,
      ageGroup: 'Adults (26–40)',
      createdAt: 1700000000000,
      hidden: false
    });
    await col.doc('legacy-missing-score').set({
      displayName: 'Missing Score',
      assessmentType: 'reaction-test',
      ageGroup: 'Adults (26–40)',
      hidden: false
    });
    await col.doc('legacy-zero-score').set({
      displayName: 'Zero Score',
      assessmentType: 'reaction-test',
      scoreMetric: 0,
      hidden: false
    });
    await col.doc('legacy-out-of-range').set({
      displayName: 'Out of Range',
      assessmentType: 'reaction-test',
      scoreMetric: 10001,
      hidden: false
    });
    await col.doc('legacy-hidden').set({
      displayName: 'Hidden Player',
      assessmentType: 'reaction-test',
      scoreMetric: 205,
      hidden: true
    });

    const entries = await repo.getEntriesByAlias('reaction-test', 'asc', 100);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'legacy-valid',
      displayName: 'Legacy Player',
      assessmentType: 'visual-reaction',
      scoreMetric: 215,
      hidden: false
    });
  });

  it('preserves safe historical aliases that do not meet the new-submission character whitelist', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreLeaderboardRepository(() => mockDb);
    await mockDb.collection('leaderboardResults').doc('legacy-punctuation').set({
      displayName: 'Legacy Player! 🙂',
      assessmentType: 'visual-reaction',
      scoreMetric: 215,
      ageGroup: 'Adults (26–40)',
      hidden: false
    });

    const entries = await repo.getEntriesByAlias('visual-reaction', 'asc', 10);
    expect(entries).toHaveLength(1);
    expect(entries[0].displayName).toBe('Legacy Player! 🙂');
  });

  it('does not write duplicate audit rows for repeated hide/unhide operations', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreLeaderboardRepository(() => mockDb);
    await mockDb.collection('leaderboardResults').doc('repeat-entry').set({
      displayName: 'Player One',
      assessmentType: 'visual-reaction',
      scoreMetric: 215,
      hidden: false
    });

    const firstHide = await repo.softHideEntry('repeat-entry', 'first hide');
    expect(firstHide).toMatchObject({ success: true, found: true });
    const repeatHide = await repo.softHideEntry('repeat-entry', 'repeat hide');
    expect(repeatHide).toMatchObject({ success: true, found: true, alreadyInState: true });

    let audit = await mockDb.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(10).get();
    expect(audit.docs).toHaveLength(1);

    const firstUnhide = await repo.unhideEntry('repeat-entry', 'restore');
    expect(firstUnhide).toMatchObject({ success: true, found: true });
    const repeatUnhide = await repo.unhideEntry('repeat-entry', 'repeat restore');
    expect(repeatUnhide).toMatchObject({ success: true, found: true, alreadyInState: true });

    audit = await mockDb.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(10).get();
    expect(audit.docs).toHaveLength(2);
  });

  it('AdminAuditRepository writes and retrieves audit logs', async () => {
    const mockDb = createMockDb();
    const repo = new FirestoreAdminAuditRepository(() => mockDb);

    const written = await repo.writeLog({
      actor: 'admin',
      action: 'BAN_USER',
      target: 'user-bad',
      timestamp: '2026-09-30T12:00:00.000Z',
      note: 'Cheating'
    });

    expect(written.id).toBeDefined();
    expect(written.action).toBe('BAN_USER');

    const logs = await repo.getRecentLogs(10);
    expect(logs.length).toBe(1);
    expect(logs[0].target).toBe('user-bad');
  });
});
