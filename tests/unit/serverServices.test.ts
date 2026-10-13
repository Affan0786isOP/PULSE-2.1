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
      unhideEntry: vi.fn(async () => ({ success: true, found: true })),
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

    // Query the Visual Reaction board: one legacy-alias query fails while the canonical query succeeds.
    const entries = await lbService.getPublicLeaderboard('visual-reaction');
    expect(entries.length).toBe(1);
    expect(entries[0].displayName).toBe('Alice');
    expect(entries[0].scoreMetric).toBe(205);
  });
  it('rejects missing or unknown protocol and distinguishes total query failure from an empty board', async () => {
    const emptyRepo = {
      getEntriesByAlias: vi.fn(async () => []),
    } as unknown as ILeaderboardRepository;
    const emptyService = new LeaderboardAppService(
      {} as ISessionRepository,
      emptyRepo,
      {} as ILeaderboardSubmissionRepository
    );

    await expect(emptyService.getPublicLeaderboard(null)).rejects.toMatchObject({ status: 400 });
    await expect(emptyService.getPublicLeaderboard('not-a-real-assessment')).rejects.toMatchObject({ status: 400 });
    await expect(emptyService.getPublicLeaderboard('visual-reaction')).resolves.toEqual([]);

    const failingRepo = {
      getEntriesByAlias: vi.fn(async () => { throw new Error('Firestore unavailable'); }),
    } as unknown as ILeaderboardRepository;
    const failingService = new LeaderboardAppService(
      {} as ISessionRepository,
      failingRepo,
      {} as ILeaderboardSubmissionRepository
    );

    await expect(failingService.getPublicLeaderboard('visual-reaction')).rejects.toMatchObject({ status: 503 });
  });

  it('rejects an ineligible display name before reading or consuming a session', async () => {
    const findById = vi.fn(async () => null);
    const mockSessionRepo: ISessionRepository = {
      findById,
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };
    const executeLeaderboardSubmission = vi.fn(async () => ({
      success: true as const,
      docId: 'lb-never-written',
      scoreMetric: 200,
      provenanceToken: 'token',
      trialsDigest: 'digest',
      derivedMetrics: {}
    }));
    const mockLbRepo = { getEntriesByAlias: vi.fn(async () => []) } as unknown as ILeaderboardRepository;
    const mockSubRepo: ILeaderboardSubmissionRepository = { executeLeaderboardSubmission };

    const service = new LeaderboardAppService(mockSessionRepo, mockLbRepo, mockSubRepo);
    await expect(service.submitLeaderboard({
      sessionId: 'session-invalid-alias',
      userId: 'user-1',
      displayName: 'Guest',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      trials: []
    })).rejects.toMatchObject({ status: 400 });

    expect(findById).not.toHaveBeenCalled();
    expect(executeLeaderboardSubmission).not.toHaveBeenCalled();
  });

  it('measures the opt-in window from session completion and expires it after 24 hours', async () => {
    const completedAt = Date.now() - 60 * 60 * 1000;
    const session: ExperimentSessionRecord = {
      sessionId: 'session-completed',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      createdAt: completedAt - 60 * 60 * 1000,
      expiresAt: completedAt - 30 * 60 * 1000,
      consumed: true,
      consumedAt: completedAt,
      derivedMetrics: { averageReactionTime: 200 },
      trialsDigest: 'digest',
      leaderboardSubmitted: false
    };
    const findById = vi.fn(async () => session);
    const mockSessionRepo: ISessionRepository = {
      findById,
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };
    const executeLeaderboardSubmission = vi.fn(async () => ({
      success: true as const,
      docId: 'lb-completed',
      scoreMetric: 200,
      provenanceToken: 'token',
      trialsDigest: 'digest',
      derivedMetrics: { averageReactionTime: 200 }
    }));
    const mockLbRepo = { getEntriesByAlias: vi.fn(async () => []) } as unknown as ILeaderboardRepository;
    const mockSubRepo: ILeaderboardSubmissionRepository = { executeLeaderboardSubmission };
    const service = new LeaderboardAppService(mockSessionRepo, mockLbRepo, mockSubRepo);

    // The session's ordinary expiry has passed, but the 24-hour completion-based
    // opt-in window is still open. Use a test-only provenance secret; never weaken
    // production signing requirements for a unit test.
    const previousProvenanceSecret = process.env.PULSE_PROVENANCE_SECRET;
    process.env.PULSE_PROVENANCE_SECRET = 'unit-test-provenance-secret';
    try {
      await expect(service.submitLeaderboard({
        sessionId: session.sessionId,
        userId: session.uid,
        displayName: 'Alice',
        assessmentType: 'visual-reaction',
        ageGroup: session.ageGroup,
        trials: []
      })).resolves.toMatchObject({ docId: 'lb-completed', scoreMetric: 200 });
      expect(executeLeaderboardSubmission).toHaveBeenCalledTimes(1);
    } finally {
      if (previousProvenanceSecret === undefined) {
        delete process.env.PULSE_PROVENANCE_SECRET;
      } else {
        process.env.PULSE_PROVENANCE_SECRET = previousProvenanceSecret;
      }
    }

    const expiredConsumedAt = Date.now() - 25 * 60 * 60 * 1000;
    const expiredSession: ExperimentSessionRecord = {
      ...session,
      sessionId: 'session-expired-opt-in',
      createdAt: expiredConsumedAt - 60 * 60 * 1000,
      consumedAt: expiredConsumedAt
    };
    const expiredFindById = vi.fn(async () => expiredSession);
    const expiredSessionRepo: ISessionRepository = {
      findById: expiredFindById,
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };
    const neverSubmit = vi.fn(async () => ({
      success: true as const,
      docId: 'should-not-write',
      scoreMetric: 200,
      provenanceToken: 'token',
      trialsDigest: 'digest',
      derivedMetrics: {}
    }));
    const expiredService = new LeaderboardAppService(
      expiredSessionRepo,
      mockLbRepo,
      { executeLeaderboardSubmission: neverSubmit }
    );

    await expect(expiredService.submitLeaderboard({
      sessionId: expiredSession.sessionId,
      userId: expiredSession.uid,
      displayName: 'Alice',
      assessmentType: 'visual-reaction',
      ageGroup: expiredSession.ageGroup,
      trials: []
    })).rejects.toMatchObject({
      status: 400,
      message: 'Assessment completion time is implausibly short for the selected test. Please retake it.'
    });
    expect(neverSubmit).not.toHaveBeenCalled();
  });

});
