import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { LeaderboardAppService } from '../../server/services/leaderboardAppService';
import type { ILeaderboardRepository } from '../../server/repositories/interfaces/ILeaderboardRepository';
import type { ISessionRepository } from '../../server/repositories/interfaces/ISessionRepository';
import type { ILeaderboardSubmissionRepository } from '../../server/repositories/interfaces/ILeaderboardSubmissionRepository';
import type { AdminLeaderboardEntryRecord } from '../../server/models/leaderboardModels';

describe('Admin Provenance & Attested Display Name Tests', () => {
  const secret = 'test-pulse-provenance-secret';
  let mockLeaderboardRepo: Record<string, any>;
  let mockSessionRepo: Record<string, any>;
  let mockSubmissionRepo: Record<string, any>;
  let service: LeaderboardAppService;

  beforeEach(() => {
    process.env.PULSE_PROVENANCE_SECRET = secret;

    mockLeaderboardRepo = {
      getEntryById: vi.fn(),
      softHideEntry: vi.fn(),
      unhideEntry: vi.fn(),
      deleteEntry: vi.fn(),
      getEntriesByAlias: vi.fn()
    };
    mockSessionRepo = {};
    mockSubmissionRepo = {};

    service = new LeaderboardAppService(
      mockSessionRepo as unknown as ISessionRepository,
      mockLeaderboardRepo as unknown as ILeaderboardRepository,
      mockSubmissionRepo as unknown as ILeaderboardSubmissionRepository
    );
  });

  it('verifies historical legacy record without attestedDisplayName using displayName', async () => {
    const entryId = 'legacy-entry-1';
    const assessmentType = 'visual-reaction';
    const ageGroup = 'Young adults (18–25)';
    const scoreMetric = 210.5;
    const displayName = 'OriginalLegacyName';
    const sanitized = displayName.replace(/:/g, '_');
    const trialsDigest = crypto.createHash('sha256').update('[]').digest('hex');

    const tokenData = `lb:v2:${entryId}:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${sanitized}:${trialsDigest}`;
    const token = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

    const record: AdminLeaderboardEntryRecord = {
      id: entryId,
      displayName,
      assessmentType,
      scoreMetric,
      ageGroup,
      trialsDigest,
      provenanceToken: token,
      provenanceVersion: 2,
      hidden: false,
      publicEntry: true,
      createdAt: 1700000000000
    };

    mockLeaderboardRepo.getEntryById.mockResolvedValueOnce(record);

    const res = await service.verifySubmissionProvenance(entryId);
    expect(res.verified).toBe(true);
    expect(res.publiclyVisible).toBe(true);
  });

  it('verifies row after multiple successive alias edits when attestedDisplayName is preserved', async () => {
    const entryId = 'entry-with-edits';
    const assessmentType = 'visual-reaction';
    const ageGroup = 'Young adults (18–25)';
    const scoreMetric = 195.2;
    const originalAttestedName = 'OriginalUser:Special';
    const sanitizedAttested = originalAttestedName.replace(/:/g, '_');
    const trialsDigest = crypto.createHash('sha256').update('[]').digest('hex');

    // Signed with originalAttestedName
    const tokenData = `lb:v2:${entryId}:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${sanitizedAttested}:${trialsDigest}`;
    const token = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

    // Current display name changed multiple times to 'ThirdEditedName'
    const record: AdminLeaderboardEntryRecord = {
      id: entryId,
      displayName: 'ThirdEditedName',
      attestedDisplayName: originalAttestedName,
      assessmentType,
      scoreMetric,
      ageGroup,
      trialsDigest,
      provenanceToken: token,
      provenanceVersion: 2,
      hidden: false,
      publicEntry: true,
      createdAt: 1700000000000
    };

    mockLeaderboardRepo.getEntryById.mockResolvedValueOnce(record);

    const res = await service.verifySubmissionProvenance(entryId);
    expect(res.verified).toBe(true);
    expect(res.publiclyVisible).toBe(true);
  });

  it('marks publiclyVisible false if current edited alias is invalid or unsafe for read', async () => {
    const entryId = 'entry-unsafe-edit';
    const assessmentType = 'visual-reaction';
    const ageGroup = 'Young adults (18–25)';
    const scoreMetric = 195.2;
    const originalAttestedName = 'ValidOriginal';
    const sanitizedAttested = originalAttestedName.replace(/:/g, '_');
    const trialsDigest = crypto.createHash('sha256').update('[]').digest('hex');

    const tokenData = `lb:v2:${entryId}:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${sanitizedAttested}:${trialsDigest}`;
    const token = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

    // Display name edited to something unsafe / contact info
    const record: AdminLeaderboardEntryRecord = {
      id: entryId,
      displayName: 'contact@example.com',
      attestedDisplayName: originalAttestedName,
      assessmentType,
      scoreMetric,
      ageGroup,
      trialsDigest,
      provenanceToken: token,
      provenanceVersion: 2,
      hidden: false,
      publicEntry: true,
      createdAt: 1700000000000
    };

    mockLeaderboardRepo.getEntryById.mockResolvedValueOnce(record);

    const res = await service.verifySubmissionProvenance(entryId);
    expect(res.verified).toBe(true); // HMAC is valid because attestedDisplayName matches
    expect(res.publiclyVisible).toBe(false); // but hidden from public rankings due to unsafe name
  });
});
