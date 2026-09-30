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
        where(field: string, _op: string, val: unknown) {
          return {
            where(_f: string, _o: string, _v: unknown) {
              return this;
            },
            orderBy(_f: string, _d: string) {
              return this;
            },
            limit(_n: number) {
              return this;
            },
            async get() {
              const matched: { id: string; data: () => Record<string, unknown> }[] = [];
              for (const [id, data] of col.entries()) {
                if (data[field] === val) {
                  matched.push({ id, data: () => JSON.parse(JSON.stringify(data)) });
                }
              }
              return { docs: matched };
            }
          };
        },
        orderBy(field: string, dir = 'asc') {
          return {
            limit(n: number) {
              return {
                async get() {
                  const arr = Array.from(col.entries()).map(([id, data]) => ({
                    id,
                    data: () => JSON.parse(JSON.stringify(data))
                  }));
                  arr.sort((a, b) => {
                    const valA = (a.data() as Record<string, unknown>)[field] as number;
                    const valB = (b.data() as Record<string, unknown>)[field] as number;
                    return dir === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
                  });
                  return { docs: arr.slice(0, n) };
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
    expect(docAfter.data().hideReason).toBe('Rule violation');
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
