import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/engines/assessmentEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/engines/assessmentEngine')>();
  return { ...actual, validateAndDeriveAssessmentFromTrials: vi.fn() };
});

import { validateAndDeriveAssessmentFromTrials } from '../../server/engines/assessmentEngine';
import { ResearchService } from '../../server/services/researchService';

afterEach(() => vi.clearAllMocks());

describe('ResearchService publicDataset privacy boundary', () => {
  it('sanitizes client-controlled trial metadata before the public Firestore write', async () => {
    const previousSecret = process.env.PULSE_PROVENANCE_SECRET;
    process.env.PULSE_PROVENANCE_SECRET = 'public-dataset-privacy-regression-secret';

    try {
      vi.mocked(validateAndDeriveAssessmentFromTrials).mockReturnValue({
        success: true,
        derivedMetrics: {
          longestSeq: 2,
          highestLevel: 2,
          totalCorrect: 1,
          totalAttempts: 2,
          overallAccuracy: 50,
          totalTimeMs: 2500
        }
      });

      const startedAt = Date.now();
      const sessionId = 'public-dataset-privacy-session';
      const userId = 'public-dataset-privacy-user';
      const ageGroup = 'Young adults (18–25)';
      const session = {
        sessionId,
        uid: userId,
        assessmentType: 'block-memory',
        ageGroup,
        createdAt: startedAt - 60_000,
        expiresAt: startedAt + 60 * 60_000,
        consumed: false
      };

      let capturedSubmission: any = null;
      const service = new ResearchService(
        {
          getAndValidateSession: vi.fn(async () => ({ valid: true, session }))
        } as any,
        {
          findUserConsumedSessions: vi.fn(async () => [])
        } as any,
        {
          executeSubmissionTransaction: vi.fn(async (input: any) => {
            capturedSubmission = input;
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
              personalBest: input.personalBest
            };
          })
        } as any,
        {} as any
      );

      const injectedEmail = 'participant-leak@example.invalid';
      const trials = [
        {
          trialNumber: 1,
          trialIndex: 1,
          sequenceNumber: 1,
          attemptNumber: 1,
          stimulusTimestamp: startedAt - 5_000,
          responseTimestamp: startedAt - 4_800,
          reactionTime: 200,
          accuracy: 0,
          falseStart: false,
          timedOut: true,
          valid: false,
          level: 1,
          sequenceLength: 3,
          generatedSequence: [1, 2, 3],
          playerSequence: [1],
          // Valid categorical values remain available to researchers.
          validity: 'ABORTED',
          qualityFlag: 'TIMEOUT_EXCEEDED',
          displayDelayOffsetSource: 'legacy-metadata'
        },
        {
          trialNumber: 2,
          trialIndex: 2,
          sequenceNumber: 2,
          attemptNumber: 1,
          stimulusTimestamp: startedAt - 3_000,
          responseTimestamp: startedAt - 2_800,
          reactionTime: 200,
          accuracy: 0,
          falseStart: false,
          timedOut: true,
          valid: false,
          level: 2,
          sequenceLength: 4,
          generatedSequence: { contact: injectedEmail },
          playerSequence: { contact: injectedEmail },
          // Memory calculators retain client metadata on aborted attempts.
          // These values must never reach the Firestore-readable public archive.
          validity: `ABORTED ${injectedEmail}`,
          qualityFlag: { note: injectedEmail },
          displayDelayOffsetSource: injectedEmail
        }
      ];

      await service.submitResearch({
        sessionId,
        userId,
        assessmentType: 'block-memory',
        ageGroup,
        trials,
        serverDeviceCategory: 'desktop'
      });

      expect(capturedSubmission).not.toBeNull();
      const publicTrials = capturedSubmission.publicDatasetDoc.progressionTrials;
      expect(publicTrials).toHaveLength(2);
      expect(publicTrials[0]).toMatchObject({
        validity: 'ABORTED',
        qualityFlag: 'TIMEOUT_EXCEEDED'
      });
      expect(publicTrials[0]).not.toHaveProperty('displayDelayOffsetSource');
      expect(publicTrials[1]).not.toHaveProperty('validity');
      expect(publicTrials[1]).not.toHaveProperty('qualityFlag');
      expect(publicTrials[1]).not.toHaveProperty('displayDelayOffsetSource');
      expect(JSON.stringify(capturedSubmission.publicDatasetDoc)).not.toContain(injectedEmail);
    } finally {
      if (previousSecret === undefined) delete process.env.PULSE_PROVENANCE_SECRET;
      else process.env.PULSE_PROVENANCE_SECRET = previousSecret;
    }
  });
});
