import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/engines/assessmentEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/engines/assessmentEngine')>();
  return {
    ...actual,
    validateAndDeriveAssessmentFromTrials: vi.fn(),
  };
});

import { validateAndDeriveAssessmentFromTrials } from '../../server/engines/assessmentEngine';
import { ResearchService } from '../../server/services/researchService';

async function submitWithDerivedScore(score: number) {
  const previousSecret = process.env.PULSE_PROVENANCE_SECRET;
  process.env.PULSE_PROVENANCE_SECRET = 'phase-one-finite-score-test-secret';

  try {
    vi.mocked(validateAndDeriveAssessmentFromTrials).mockReturnValue({
      success: true,
      derivedMetrics: { averageReactionTime: score },
    });

    const startedAt = Date.now();
    const sessionId = 'finite-score-session';
    const userId = 'finite-score-user';
    const ageGroup = 'Young adults (18–25)';
    const session = {
      sessionId,
      uid: userId,
      assessmentType: 'visual-reaction',
      ageGroup,
      createdAt: startedAt - 60_000,
      expiresAt: startedAt + 60 * 60_000,
      consumed: false,
    };

    let captured: any = null;
    const service = new ResearchService(
      {
        getAndValidateSession: vi.fn(async () => ({ valid: true, session })),
      } as any,
      {
        findUserConsumedSessions: vi.fn(async () => []),
      } as any,
      {
        executeSubmissionTransaction: vi.fn(async (input: any) => {
          captured = input;
          return {
            success: true,
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
          };
        }),
      } as any,
      {} as any,
    );

    await service.submitResearch({
      sessionId,
      userId,
      assessmentType: 'visual-reaction',
      ageGroup,
      serverDeviceCategory: 'desktop',
      trials: [{
        trialNumber: 1,
        trialIndex: 1,
        sequenceNumber: 1,
        attemptNumber: 1,
        stimulusTimestamp: startedAt - 2_000,
        responseTimestamp: startedAt - 1_800,
        reactionTime: 200,
        reactionTimeMs: 200,
        accuracy: 1,
        valid: true,
        falseStart: false,
        timedOut: false,
      }],
    });

    return captured;
  } finally {
    if (previousSecret === undefined) delete process.env.PULSE_PROVENANCE_SECRET;
    else process.env.PULSE_PROVENANCE_SECRET = previousSecret;
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ResearchService finite personal-best scores', () => {
  it.each([
    ['NaN', Number.NaN],
    ['positive Infinity', Number.POSITIVE_INFINITY],
    ['negative Infinity', Number.NEGATIVE_INFINITY],
  ])('does not persist %s as a personal best', async (_label, score) => {
    const captured = await submitWithDerivedScore(score);

    expect(captured.currentScore).toBeNull();
    expect(captured.isNewPersonalBest).toBe(false);
    expect(captured.previousPersonalBest).toBeNull();
    expect(captured.personalBest).toBeNull();
  });
});
