import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../server/services/adminService';
import type { ILeaderboardRepository } from '../../server/repositories/interfaces/ILeaderboardRepository';
import type { AdminLeaderboardEntryRecord } from '../../server/models/adminModels';
import { AppError } from '../../server/models/replayContracts';

describe('AdminService Unit Tests', () => {
  let mockLeaderboardRepo: Record<string, any>;
  let mockSessionVerifier: {
    createAdminToken: ReturnType<typeof vi.fn>;
    revokeAdminToken: ReturnType<typeof vi.fn>;
    validatePasscode: ReturnType<typeof vi.fn>;
  };
  let service: AdminService;

  beforeEach(() => {
    mockLeaderboardRepo = {
      softHideEntry: vi.fn(),
      unhideEntry: vi.fn(),
      deleteEntry: vi.fn(),
      updateEntryAlias: vi.fn(),
      getAllEntriesForAdminPage: vi.fn(),
      getEntriesByAlias: vi.fn()
    };

    mockSessionVerifier = {
      createAdminToken: vi.fn(async () => 'mock-token-xyz'),
      revokeAdminToken: vi.fn(async () => {}),
      validatePasscode: vi.fn((code: string) => code === '180611')
    };

    service = new AdminService(
      mockLeaderboardRepo as unknown as ILeaderboardRepository,
      mockSessionVerifier as any
    );
  });

  describe('Authentication: login & logout', () => {
    it('successfully logs in with valid passcode and returns token', async () => {
      const res = await service.login('180611');
      expect(res.success).toBe(true);
      expect(res.token).toBe('mock-token-xyz');
      expect(mockSessionVerifier.validatePasscode).toHaveBeenCalledWith('180611');
      expect(mockSessionVerifier.createAdminToken).toHaveBeenCalled();
    });

    it('rejects invalid passcode with 401 AppError', async () => {
      await expect(service.login('wrong-pass')).rejects.toThrow(AppError);
      await expect(service.login('wrong-pass')).rejects.toMatchObject({ status: 401 });
    });

    it('rejects empty or non-string passcode with 400 AppError', async () => {
      await expect(service.login('')).rejects.toMatchObject({ status: 400 });
      await expect(service.login(null as unknown as string)).rejects.toMatchObject({ status: 400 });
    });

    it('successfully revokes token on logout', async () => {
      const res = await service.logout('mock-token-xyz');
      expect(res.success).toBe(true);
      expect(mockSessionVerifier.revokeAdminToken).toHaveBeenCalledWith('mock-token-xyz');
    });

    it('rejects empty token on logout with 400', async () => {
      await expect(service.logout('')).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('Leaderboard Pagination & DTO Projection', () => {
    const rawRecord: AdminLeaderboardEntryRecord = {
      id: 'entry-123',
      displayName: 'AliceSpeed',
      assessmentType: 'visual-reaction',
      scoreMetric: 215.4,
      ageGroup: 'Young adults (18–25)',
      createdAt: 1700000000000,
      hidden: false,
      publicEntry: true,
      // Private fields that MUST be stripped:
      ownerUid: 'secret-owner-uid',
      sessionId: 'private-session-xyz',
      trialsDigest: 'sha256-trials-digest',
      qualityFlags: ['bot_flag'],
      moderationReason: 'internal reason',
      provenanceToken: 'hmac-secret-signature'
    };

    it('fetches leaderboard page and strips private metadata from DTOs', async () => {
      mockLeaderboardRepo.getAllEntriesForAdminPage.mockResolvedValueOnce({
        entries: [rawRecord],
        nextCursor: 'entry-123',
        hasMore: false
      });

      const res = await service.getLeaderboardPage({ limit: 50 });
      expect(res.success).toBe(true);
      expect(res.entries).toHaveLength(1);

      const dto = res.entries[0];
      expect(dto).toEqual({
        id: 'entry-123',
        displayName: 'AliceSpeed',
        assessmentType: 'visual-reaction',
        scoreMetric: 215.4,
        ageGroup: 'Young adults (18–25)',
        createdAt: 1700000000000,
        hidden: false,
        publicEntry: true
      });

      // Assert private fields are strictly absent
      expect((dto as any).ownerUid).toBeUndefined();
      expect((dto as any).sessionId).toBeUndefined();
      expect((dto as any).trialsDigest).toBeUndefined();
      expect((dto as any).qualityFlags).toBeUndefined();
      expect((dto as any).moderationReason).toBeUndefined();
      expect((dto as any).provenanceToken).toBeUndefined();
    });

    it('filters entries by prefix and assessmentType', async () => {
      mockLeaderboardRepo.getAllEntriesForAdminPage.mockResolvedValueOnce({
        entries: [
          rawRecord,
          {
            ...rawRecord,
            id: 'entry-456',
            displayName: 'BobMemory',
            assessmentType: 'block-memory'
          }
        ],
        nextCursor: null,
        hasMore: false
      });

      const res = await service.getLeaderboardPage({
        assessmentType: 'block-memory',
        prefix: 'bob'
      });
      expect(res.entries).toHaveLength(1);
      expect(res.entries[0].id).toBe('entry-456');
    });

    it('rejects invalid assessmentType filter with 400', async () => {
      await expect(
        service.getLeaderboardPage({ assessmentType: 'invalid-test-name' })
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('Alias Modification: editLeaderboardAlias', () => {
    it('successfully modifies alias and returns projected DTO', async () => {
      mockLeaderboardRepo.updateEntryAlias.mockResolvedValueOnce({
        success: true,
        found: true,
        entry: {
          id: 'entry-123',
          displayName: 'RenamedAlice',
          assessmentType: 'visual-reaction',
          scoreMetric: 215.4,
          ageGroup: 'Young adults (18–25)',
          createdAt: 1700000000000,
          hidden: false,
          publicEntry: true,
          ownerUid: 'secret-owner'
        }
      });

      const res = await service.editLeaderboardAlias({
        id: 'entry-123',
        displayName: 'RenamedAlice',
        reason: 'Typo fix'
      });

      expect(res.success).toBe(true);
      expect(res.entry.displayName).toBe('RenamedAlice');
      expect((res.entry as any).ownerUid).toBeUndefined();
      expect(mockLeaderboardRepo.updateEntryAlias).toHaveBeenCalledWith(
        'entry-123',
        'RenamedAlice',
        'Typo fix'
      );
    });

    it('rejects invalid display name with 400', async () => {
      await expect(
        service.editLeaderboardAlias({ id: 'entry-123', displayName: '  ' })
      ).rejects.toMatchObject({ status: 400 });

      await expect(
        service.editLeaderboardAlias({ id: 'entry-123', displayName: 'a'.repeat(31) })
      ).rejects.toMatchObject({ status: 400 });
    });

    it('maps OWNER_ERASURE_IN_PROGRESS to 409', async () => {
      mockLeaderboardRepo.updateEntryAlias.mockRejectedValueOnce(
        new Error('OWNER_ERASURE_IN_PROGRESS')
      );

      await expect(
        service.editLeaderboardAlias({ id: 'entry-123', displayName: 'ValidName' })
      ).rejects.toMatchObject({ status: 409 });
    });

    it('maps PROVENANCE_MISMATCH to 422', async () => {
      mockLeaderboardRepo.updateEntryAlias.mockRejectedValueOnce(
        new Error('PROVENANCE_MISMATCH')
      );

      await expect(
        service.editLeaderboardAlias({ id: 'entry-123', displayName: 'ValidName' })
      ).rejects.toMatchObject({ status: 422 });
    });

    it('maps not found to 404', async () => {
      mockLeaderboardRepo.updateEntryAlias.mockResolvedValueOnce({
        success: false,
        found: false
      });

      await expect(
        service.editLeaderboardAlias({ id: 'entry-missing', displayName: 'ValidName' })
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('Moderation Actions: hide, unhide, delete', () => {
    it('softHideEntry calls repo and returns status', async () => {
      mockLeaderboardRepo.softHideEntry.mockResolvedValueOnce({
        success: true,
        found: true
      });

      const res = await service.hideLeaderboardEntry('entry-123', 'spam');
      expect(res.success).toBe(true);
      expect(mockLeaderboardRepo.softHideEntry).toHaveBeenCalledWith('entry-123', 'spam');
    });

    it('softHideEntry throws 404 when entry not found', async () => {
      mockLeaderboardRepo.softHideEntry.mockResolvedValueOnce({
        success: true,
        found: false
      });

      await expect(
        service.hideLeaderboardEntry('entry-404')
      ).rejects.toMatchObject({ status: 404 });
    });

    it('unhideLeaderboardEntry throws 409 when erasureInProgress is returned', async () => {
      mockLeaderboardRepo.unhideEntry.mockResolvedValueOnce({
        success: true,
        found: true,
        alreadyInState: true,
        erasureInProgress: true
      });

      await expect(
        service.unhideLeaderboardEntry('entry-123')
      ).rejects.toMatchObject({ status: 409 });
    });

    it('unhideLeaderboardEntry returns notBest if candidate cannot replace retained best', async () => {
      mockLeaderboardRepo.unhideEntry.mockResolvedValueOnce({
        success: true,
        found: true,
        alreadyInState: true,
        notBest: true,
        retainedEntryId: 'better-entry-999'
      });

      const res = await service.unhideLeaderboardEntry('entry-123');
      expect(res.notBest).toBe(true);
      expect(res.retainedEntryId).toBe('better-entry-999');
    });

    it('deleteLeaderboardEntry calls repo and maps 404 if not found', async () => {
      mockLeaderboardRepo.deleteEntry.mockResolvedValueOnce({
        success: true,
        found: false
      });

      await expect(
        service.deleteLeaderboardEntry('entry-404')
      ).rejects.toMatchObject({ status: 404 });
    });

    it('deleteLeaderboardEntry maps erasure lock to 409', async () => {
      mockLeaderboardRepo.deleteEntry.mockRejectedValueOnce(
        new Error('OWNER_ERASURE_IN_PROGRESS')
      );

      await expect(
        service.deleteLeaderboardEntry('entry-123')
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
