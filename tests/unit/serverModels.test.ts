import { describe, it, expect } from 'vitest';
import { normalizeAssessmentType } from '../../server/engines/assessmentTypes';
import { SessionAlreadyConsumedError, LeaderboardAlreadySubmittedError } from '../../server/models/replayContracts';
import type { ExperimentSessionRecord } from '../../server/models/sessionModels';

describe('Server Models & Helpers Unit Tests', () => {
  it('normalizes assessment types with whitespace and hyphens correctly', () => {
    expect(normalizeAssessmentType(' visual_reaction ')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction-reflex')).toBe('direction');
    expect(normalizeAssessmentType('colour recognition')).toBe('color-recognition');
    expect(normalizeAssessmentType('block-memory-test')).toBe('block-memory');
    expect(normalizeAssessmentType('number')).toBe('number-memory');
  });

  it('instantiates SessionAlreadyConsumedError carrying typed session record', () => {
    const sessionData: ExperimentSessionRecord = {
      sessionId: 'sess-123',
      uid: 'user-abc',
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      createdAt: 1700000000000,
      expiresAt: 1700000900000,
      consumed: true,
      researchDocId: 'doc-res-123',
      scoreMetric: 220
    };

    const error = new SessionAlreadyConsumedError(sessionData);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SessionAlreadyConsumedError);
    expect(error.message).toBe('SESSION_ALREADY_CONSUMED');
    expect(error.sessionData.researchDocId).toBe('doc-res-123');
    expect(error.sessionData.scoreMetric).toBe(220);
  });

  it('instantiates LeaderboardAlreadySubmittedError carrying typed session record', () => {
    const sessionData: ExperimentSessionRecord = {
      sessionId: 'sess-456',
      uid: 'user-def',
      assessmentType: 'block-memory',
      ageGroup: 'Adults (26–40)',
      createdAt: 1700000000000,
      expiresAt: 1700000900000,
      consumed: true,
      leaderboardSubmitted: true,
      leaderboardDocId: 'lb-doc-456',
      scoreMetric: 7
    };

    const error = new LeaderboardAlreadySubmittedError(sessionData);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LeaderboardAlreadySubmittedError);
    expect(error.message).toBe('LEADERBOARD_ALREADY_SUBMITTED');
    expect(error.sessionData.leaderboardDocId).toBe('lb-doc-456');
    expect(error.sessionData.scoreMetric).toBe(7);
  });
});
