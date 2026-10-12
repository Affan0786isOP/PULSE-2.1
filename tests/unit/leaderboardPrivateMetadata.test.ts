import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreLeaderboardSubmissionRepository } from '../../server/repositories/firestore/firestoreLeaderboardSubmissionRepository';

describe('leaderboard public/private document split', () => {
  it('writes only display fields to leaderboardResults and keeps owner/session/research fields private', async () => {
    const session = {
      sessionId: 'session-123',
      uid: 'private-user-123',
      assessmentType: 'visual-reaction',
      ageGroup: '18-25',
      createdAt: 1_000,
      expiresAt: 999_999,
      consumed: true,
      consumedAt: 11_000,
      leaderboardSubmitted: false,
      derivedMetrics: { averageReactionTime: 210 },
      trialsDigest: 'private-digest'
    };

    const makeRef = (collectionName: string, id: string) => ({
      collectionName,
      id,
      path: `${collectionName}/${id}`
    });
    const makeCollection = (collectionName: string) => ({
      doc: (id: string) => makeRef(collectionName, id),
      where: (...args: unknown[]) => ({ collectionName, isQuery: true, args })
    });

    const db: any = {
      collection: (name: string) => makeCollection(name),
      runTransaction: async (callback: (tx: any) => unknown) => callback(tx)
    };
    const tx = {
      get: vi.fn(async (target: any) => {
        if (target?.isQuery) return { docs: [], size: 0, empty: true };
        if (target?.collectionName === 'experimentSessions') {
          return { exists: true, data: () => session };
        }
        return { exists: false, data: () => undefined };
      }),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    db.runTransaction = async (callback: (transaction: any) => unknown) => callback(tx);

    const repository = new FirestoreLeaderboardSubmissionRepository(() => db as Firestore);
    const result = await repository.executeLeaderboardSubmission({
      leaderboardDocId: 'leaderboard-row-1',
      activeSessionId: session.sessionId,
      userId: session.uid,
      displayName: 'PULSE Learner',
      assessmentType: 'visual-reaction',
      scoreMetric: 210,
      authoritativeAgeGroup: session.ageGroup,
      provenanceToken: 'signed-token',
      trialsDigest: 'private-digest',
      metrics: { averageReactionTime: 210 },
      now: 12_000,
      idempotencyKey: 'private-idempotency-key',
      requiresModeration: false,
      qualityFlags: []
    });

    const publicWrite = tx.set.mock.calls.find(([ref]: [any, any]) =>
      ref.collectionName === 'leaderboardResults'
    )?.[1];
    const privateWrite = tx.set.mock.calls.find(([ref]: [any, any]) =>
      ref.collectionName === 'leaderboardPrivateMeta'
    )?.[1];

    expect(result.success).toBe(true);
    expect(publicWrite).toMatchObject({
      displayName: 'PULSE Learner',
      assessmentType: 'visual-reaction',
      scoreMetric: 210,
      ageGroup: '18-25',
      provenanceToken: 'signed-token',
      hidden: false
    });
    for (const privateField of [
      'ownerUid', 'sessionId', 'trialsDigest', 'derivedMetrics', 'idempotencyKey',
      'qualityFlags', 'moderationReason'
    ]) {
      expect(publicWrite).not.toHaveProperty(privateField);
    }

    expect(privateWrite).toMatchObject({
      ownerUid: 'private-user-123',
      sessionId: 'session-123',
      assessmentType: 'visual-reaction',
      trialsDigest: 'private-digest',
      derivedMetrics: { averageReactionTime: 210 },
      idempotencyKey: 'private-idempotency-key',
      hidden: false
    });
  });
});
