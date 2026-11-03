import { describe, it, expect, vi } from 'vitest';
import { SessionService } from '../../server/services/sessionService';
import { PersonalBestService } from '../../server/services/personalBestService';
import { LeaderboardAppService } from '../../server/services/leaderboardAppService';
import type { ISessionRepository } from '../../server/repositories/interfaces/ISessionRepository';
import type { ILeaderboardRepository } from '../../server/repositories/interfaces/ILeaderboardRepository';
import type { ILeaderboardSubmissionRepository } from '../../server/repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ExperimentSessionRecord } from '../../server/models/sessionModels';
import { ResearchService } from '../../server/services/researchService';
import { SessionAlreadyConsumedError } from '../../server/models/replayContracts';
import { seedPRNG } from '../../server/engines/prng';
import { generateVrtForeperiod } from '../../server/engines/reactionCalculator';

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
  it('backfills each legacy leaderboard entry once and skips ambiguous source sessions', async () => {
    const makeSession = (
      sessionId: string,
      leaderboardDocId: string,
      leaderboardSubmissionId?: string
    ): ExperimentSessionRecord => ({
      sessionId,
      uid: 'backfill-user',
      assessmentType: 'visual-reaction',
      ageGroup: 'Adults (26–40)',
      createdAt: 1,
      expiresAt: 10_000,
      consumed: true,
      leaderboardDocId,
      ...(leaderboardSubmissionId ? { leaderboardSubmissionId } : {})
    });
    const sessions = [
      makeSession('ambiguous-a', 'entry-ambiguous'),
      makeSession('ambiguous-b', 'entry-ambiguous'),
      makeSession('unattested-duplicate', 'entry-attested'),
      makeSession('source-attested', 'entry-attested', 'entry-attested'),
      makeSession('single-legacy-source', 'entry-legacy'),
      // A weaker/tied attempt must not be used as the retained row's source.
      makeSession('weaker-attempt', 'entry-legacy', 'different-attempt')
    ];
    const mockSessionRepo: ISessionRepository = {
      findById: vi.fn(async () => null),
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => sessions)
    };
    const linkOwnerToEntry = vi.fn(async () => true);
    const deleteEntriesByOwner = vi.fn(async () => 0);
    const mockLbRepo = {
      linkOwnerToEntry,
      deleteEntriesByOwner
    } as unknown as ILeaderboardRepository;
    const service = new LeaderboardAppService(
      mockSessionRepo,
      mockLbRepo,
      {} as ILeaderboardSubmissionRepository
    );

    await expect(service.deleteMyLeaderboardEntries('backfill-user', 'visual-reaction'))
      .resolves.toEqual({ deletedCount: 0 });

    expect(linkOwnerToEntry).toHaveBeenCalledTimes(2);
    expect(linkOwnerToEntry).toHaveBeenCalledWith('entry-attested', 'backfill-user', 'source-attested');
    expect(linkOwnerToEntry).toHaveBeenCalledWith('entry-legacy', 'backfill-user', 'single-legacy-source');
    expect(deleteEntriesByOwner).toHaveBeenCalledWith('backfill-user', 'visual-reaction');
  });

  it('bounds concurrent legacy ownership-link transactions', async () => {
    const sessions: ExperimentSessionRecord[] = Array.from({ length: 12 }, (_, index) => ({
      sessionId: `session-${index}`,
      uid: 'backfill-user',
      assessmentType: 'visual-reaction',
      ageGroup: 'Adults (26–40)',
      createdAt: index + 1,
      expiresAt: 10_000,
      consumed: true,
      leaderboardDocId: `entry-${index}`
    }));
    const mockSessionRepo: ISessionRepository = {
      findById: vi.fn(async () => null),
      create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => sessions)
    };
    let active = 0;
    let maximumActive = 0;
    const linkOwnerToEntry = vi.fn(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
      return true;
    });
    const deleteEntriesByOwner = vi.fn(async () => sessions.length);
    const mockLbRepo = {
      linkOwnerToEntry,
      deleteEntriesByOwner
    } as unknown as ILeaderboardRepository;
    const service = new LeaderboardAppService(
      mockSessionRepo,
      mockLbRepo,
      {} as ILeaderboardSubmissionRepository
    );

    await service.deleteMyLeaderboardEntries('backfill-user', 'visual-reaction');

    expect(linkOwnerToEntry).toHaveBeenCalledTimes(12);
    expect(maximumActive).toBe(5);
    expect(active).toBe(0);
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
      message: 'The leaderboard opt-in window has expired. Please retake the test.'
    });
    expect(neverSubmit).not.toHaveBeenCalled();
  });

  it('allows a replay of an already-submitted session after the 24-hour opt-in deadline', async () => {
    const oldCompletedAt = Date.now() - 26 * 60 * 60 * 1000;
    const session: ExperimentSessionRecord = {
      sessionId: 'session-replay-expired', uid: 'user-replay', assessmentType: 'visual-reaction',
      ageGroup: 'Adolescents (13–17)', createdAt: oldCompletedAt - 60 * 60 * 1000,
      expiresAt: oldCompletedAt - 30 * 60 * 1000, consumed: true, consumedAt: oldCompletedAt,
      leaderboardSubmitted: true, leaderboardSubmissionId: 'attempt-replay', leaderboardDocId: null,
      leaderboardSubmissionScoreMetric: 205, leaderboardSubmissionProvenanceToken: 'stored-token',
      leaderboardSubmissionTrialsDigest: 'stored-digest', leaderboardSubmissionDerivedMetrics: { averageReactionTime: 205 }
    };
    const sessionRepo: ISessionRepository = {
      findById: vi.fn(async () => session), create: vi.fn(async r => r as ExperimentSessionRecord),
      findUserConsumedSessions: vi.fn(async () => [])
    };
    const service = new LeaderboardAppService(sessionRepo, {} as ILeaderboardRepository, {} as ILeaderboardSubmissionRepository);
    await expect(service.submitLeaderboard({
      sessionId: session.sessionId, userId: session.uid, displayName: 'Player One',
      assessmentType: 'visual-reaction', ageGroup: session.ageGroup, trials: []
    })).rejects.toMatchObject({ sessionData: { leaderboardSubmissionId: 'attempt-replay' } });
  });

  it('resolves private attempt receipts separately from currently visible leaderboard entries', async () => {
    const getEntryById = vi.fn(async (id: string) => {
      if (id === 'private-attempt') return {
        id, ownerUid: 'user-replay', assessmentType: 'visual-reaction', scoreMetric: 240,
        hidden: false, publicEntry: false, provenanceToken: 'attempt-token'
      };
      return null;
    });
    const repo = {
      getEntryById, getEntriesByAlias: vi.fn(async () => []),
      getAllEntriesForAdmin: vi.fn(async () => []),
      softHideEntry: vi.fn(async () => ({ success: true, found: true })),
      unhideEntry: vi.fn(async () => ({ success: true, found: true })),
      deleteEntry: vi.fn(async () => ({ success: true, found: true }))
    } as unknown as ILeaderboardRepository;
    const service = new LeaderboardAppService(
      { findById: vi.fn(async () => null), create: vi.fn(async r => r as ExperimentSessionRecord), findUserConsumedSessions: vi.fn(async () => []) },
      repo, {} as ILeaderboardSubmissionRepository
    );
    await expect(service.getSubmissionReplayState('private-attempt', 'deleted-public-best', 'user-replay', 'visual-reaction'))
      .resolves.toEqual({ receiptAvailable: true, entryAvailable: false, leaderboardDocId: null, leaderboardProvenanceToken: null, pendingReview: false });
    await expect(service.getSubmissionReplayState('erased-attempt', null, 'user-replay', 'visual-reaction'))
      .resolves.toEqual({ receiptAvailable: false, entryAvailable: false, leaderboardDocId: null, leaderboardProvenanceToken: null, pendingReview: false });
  });

  it('versions the publicDataset document through ResearchService for raw-latency protocols', async () => {
    const previousSecret = process.env.PULSE_PROVENANCE_SECRET;
    process.env.PULSE_PROVENANCE_SECRET = 'unit-test-provenance-secret';

    try {
      const sessionId = 'vrt-versioning-session';
      const userId = 'vrt-versioning-user';
      const ageGroup = 'Young adults (18–25)';
      const startedAt = Date.now();
      const session = {
        sessionId,
        uid: userId,
        assessmentType: 'visual-reaction',
        ageGroup,
        createdAt: startedAt - 60_000,
        expiresAt: startedAt + 60 * 60_000,
        consumed: false,
      };
      let capturedSubmission: any = null;

      const executeSubmissionTransaction = vi.fn(async (input: any) => ({
        success: true as const,
        docId: input.docId,
        sessionId: input.sessionId,
        completedAtTimestamp: input.completedAtTimestamp,
        completedAtMonth: input.completedAtMonth,
        provenanceToken: input.provenanceToken,
        trialsDigest: input.trialsDigest,
        derivedMetrics: input.derivedMetrics,
        scoreMetric: input.currentScore,
        isNewPersonalBest: input.isNewPersonalBest,
        previousPersonalBest: input.previousPersonalBest,
        personalBest: input.personalBest,
      }));

      const service = new ResearchService(
        {
          getAndValidateSession: vi.fn(async () => ({ valid: true, session })),
        } as any,
        {
          findUserConsumedSessions: vi.fn(async () => []),
        } as any,
        {
          executeSubmissionTransaction: vi.fn(async (input: any) => {
            capturedSubmission = input;
            return executeSubmissionTransaction(input);
          }),
        } as any,
        {} as any,
      );

      const trials = Array.from({ length: 10 }, (_, index) => {
        const trialNumber = index + 1;
        const foreperiod = generateVrtForeperiod(
          seedPRNG(`${sessionId}-reaction-delays-t${trialNumber}-a1`)
        );
        const stimulusTimestamp = startedAt - 5_000 + index * 1_000;
        return {
          trialNumber,
          trialIndex: trialNumber,
          sequenceNumber: trialNumber,
          attemptNumber: 1,
          test: 'visual-reaction',
          stimulusTimestamp,
          responseTimestamp: stimulusTimestamp + 250,
          reactionTime: 250,
          reactionTimeMs: 250,
          rawReactionTime: 250,
          rawLatencyMs: 250,
          foreperiodMs: foreperiod.foreperiodMs,
          foreperiodCategory: foreperiod.foreperiodCategory,
          displayDelayOffsetMs: null,
          displayDelayOffsetEstimated: null,
          displayDelayOffsetSource: null,
          falseStart: false,
          timedOut: false,
          valid: true,
          accuracy: 1,
        };
      });

      await service.submitResearch({
        sessionId,
        userId,
        assessmentType: 'visual-reaction',
        ageGroup,
        trials,
        serverDeviceCategory: 'desktop',
      });

      expect(capturedSubmission).not.toBeNull();
      expect(capturedSubmission.publicDatasetDoc).toMatchObject({
        assessmentVersion: 'v1.0.0',
        protocolVersion: 'v1.1.0',
        datasetSchemaVersion: 'v1.0.0',
        metricsVersion: 'v1.1.0',
      });
      expect(executeSubmissionTransaction).toHaveBeenCalledTimes(1);
    } finally {
      if (previousSecret === undefined) delete process.env.PULSE_PROVENANCE_SECRET;
      else process.env.PULSE_PROVENANCE_SECRET = previousSecret;
    }
  });

  it('throws SessionAlreadyConsumedError when session is already consumed (BUG-05)', async () => {
    const consumedSession = {
      sessionId: 'consumed-sess-1',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      createdAt: Date.now() - 60000,
      expiresAt: Date.now() + 60000,
      consumed: true,
      researchDocId: 'doc-already-done'
    };

    const service = new ResearchService(
      {
        getAndValidateSession: vi.fn(async () => ({
          valid: false,
          error: 'Experiment session has already been completed/consumed',
          session: consumedSession
        })),
      } as any,
      {
        findById: vi.fn(async () => consumedSession),
      } as any,
      {} as any,
      {} as any
    );

    await expect(
      service.submitResearch({
        sessionId: 'consumed-sess-1',
        userId: 'user-1',
        assessmentType: 'visual-reaction',
        ageGroup: 'Young adults (18–25)',
        serverDeviceCategory: 'desktop',
        trials: [],
      })
    ).rejects.toBeInstanceOf(SessionAlreadyConsumedError);
  });

  it('validates minimum duration Date.now() - session.createdAt >= minimumDurationMs (BUG-15)', async () => {
    const rapidSession = {
      sessionId: 'rapid-sess-1',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      createdAt: Date.now() - 1000, // Only 1s elapsed, min duration is 5s
      expiresAt: Date.now() + 60000,
      consumed: false
    };

    const service = new ResearchService(
      {
        getAndValidateSession: vi.fn(async () => ({ valid: true, session: rapidSession })),
      } as any,
      {} as any,
      {} as any,
      {} as any
    );

    await expect(
      service.submitResearch({
        sessionId: 'rapid-sess-1',
        userId: 'user-1',
        assessmentType: 'visual-reaction',
        ageGroup: 'Young adults (18–25)',
        serverDeviceCategory: 'desktop',
        trials: [],
      })
    ).rejects.toMatchObject({ message: expect.stringContaining('implausibly short') });
  });

  it('preserves completedAtTimestamp in getDataset public records (BUG-13)', async () => {
    const mockDatasetRepo = {
      queryRawDataset: vi.fn(async () => ({
        results: [
          {
            id: 'res-doc-1',
            sessionId: 'sess-1',
            assessmentType: 'visual-reaction',
            ageGroup: 'Young adults (18–25)',
            completedAtTimestamp: 1705000000000,
            completedAtMonth: '2024-01',
            scoreMetric: 220,
            derivedMetrics: { averageReactionTime: 220 }
          }
        ],
        sessionMap: new Map(),
        trialsBySession: new Map(),
        hasMore: false,
        nextCursor: null
      })),
      getDatasetSummary: vi.fn()
    };

    const service = new ResearchService({} as any, {} as any, {} as any, mockDatasetRepo as any);
    const res = await service.getDataset({ limitCount: 10 });
    expect(res.records).toHaveLength(1);
    expect(res.records[0].completedAtTimestamp).toBe(1705000000000);
  });
});
