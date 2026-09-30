import { describe, it, expect, vi } from 'vitest';
import { SessionService } from '../../server/services/sessionService';
import { PersonalBestService } from '../../server/services/personalBestService';
import { LeaderboardAppService } from '../../server/services/leaderboardAppService';
import type { ISessionRepository } from '../../server/repositories/interfaces/ISessionRepository';
import type { ILeaderboardRepository } from '../../server/repositories/interfaces/ILeaderboardRepository';
import type { ILeaderboardSubmissionRepository } from '../../server/repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ExperimentSessionRecord } from '../../server/models/sessionModels';

describe('Server Application Services Unit Tests', () => {
  it('SessionService validates session parameters and lifecycle', async () => {
    const mockSessionRepo: ISessionRepository = {
      findById: vi.fn(async (id: string): Promise<ExperimentSessionRecord | null> => {
        if (id === 'valid-sess') {
          return {
            sessionId: 'valid-sess',
            uid: 'user-1',
            assessmentType: 'visual-reaction',
            ageGroup: 'Young adults (18–25)',
            createdAt: Date.now() - 1000,
            expiresAt: Date.now() + 600000,
            consumed: false
          };
        }
        return null;
      }),
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };

    const sessionService = new SessionService(mockSessionRepo);

    const startRes = await sessionService.startSession({
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      userId: 'user-1'
    });
    expect(startRes.sessionId).toBeDefined();
    expect(startRes.assessmentType).toBe('visual-reaction');

    const validCheck = await sessionService.getAndValidateSession('valid-sess', 'user-1', 'visual-reaction');
    expect(validCheck.valid).toBe(true);
    expect(validCheck.session?.sessionId).toBe('valid-sess');

    const missingCheck = await sessionService.getAndValidateSession('missing-sess', 'user-1', 'visual-reaction');
    expect(validCheck.valid).toBe(true);
    expect(missingCheck.valid).toBe(false);
    expect(missingCheck.status).toBe(404);
  });

  it('PersonalBestService safely handles query errors and computes correct best', async () => {
    const mockSessionRepo: ISessionRepository = {
      findById: vi.fn(async () => null),
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async (_uid, type): Promise<ExperimentSessionRecord[]> => {
        if (type === 'error-test') {
          throw new Error('PERMISSION_DENIED');
        }
        return [
          {
            sessionId: 's1',
            uid: 'u1',
            assessmentType: 'visual-reaction',
            ageGroup: 'Young adults (18–25)',
            createdAt: 1000,
            expiresAt: 2000,
            consumed: true,
            scoreMetric: 250
          },
          {
            sessionId: 's2',
            uid: 'u1',
            assessmentType: 'visual-reaction',
            ageGroup: 'Young adults (18–25)',
            createdAt: 3000,
            expiresAt: 4000,
            consumed: true,
            scoreMetric: 210
          }
        ];
      })
    };

    const pbService = new PersonalBestService(mockSessionRepo);

    // Lower is better for visual-reaction: 210 < 250
    const pb = await pbService.getPersonalBest('u1', 'visual-reaction');
    expect(pb).toBe(210);

    // Error case: catches and returns null resiliently
    const errPb = await pbService.getPersonalBest('u1', 'error-test');
    expect(errPb).toBeNull();
  });

  it('LeaderboardAppService executes per-alias query isolation and merges results', async () => {
    const mockSessionRepo: ISessionRepository = {
      findById: vi.fn(async () => null),
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };
    const mockLbRepo: ILeaderboardRepository = {
      getEntriesByAlias: vi.fn(async (alias, _dir, _lim) => {
        if (alias === 'direction') {
          throw new Error('Temporary Firestore timeout');
        }
        if (alias === 'visual-reaction') {
          return [
            {
              id: 'lb-vr-1',
              displayName: 'Alice',
              assessmentType: 'visual-reaction',
              scoreMetric: 205,
              ageGroup: 'Adults (26–40)',
              createdAt: 1000,
              provenanceToken: 'tok1',
              hidden: false
            }
          ];
        }
        return [];
      }),
      getAllEntriesForAdmin: vi.fn(async () => []),
      softHideEntry: vi.fn(async () => ({ success: true, found: true })),
      deleteEntry: vi.fn(async () => ({ success: true, found: true }))
    };
    const mockSubRepo: ILeaderboardSubmissionRepository = {
      executeLeaderboardSubmission: vi.fn(async () => ({
        success: true as const,
        docId: 'lb-1',
        scoreMetric: 205,
        provenanceToken: 'tok',
        trialsDigest: 'dig',
        derivedMetrics: {}
      }))
    };

    const lbService = new LeaderboardAppService(mockSessionRepo, mockLbRepo, mockSubRepo);

    // Query unfiltered leaderboard: direction fails, visual-reaction succeeds, returns 200 with partial merged results
    const entries = await lbService.getPublicLeaderboard(null);
    expect(entries.length).toBe(1);
    expect(entries[0].displayName).toBe('Alice');
    expect(entries[0].scoreMetric).toBe(205);
  });
});
