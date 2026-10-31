import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileAttributionService } from '../../../../server/services/profileAttributionService';

describe('ProfileAttributionService', () => {
  let mockProfilesDb: any;
  let mockTx: any;
  let service: ProfileAttributionService;

  beforeEach(() => {
    mockTx = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    mockProfilesDb = {
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({ path: `${colName}/${docId}`, id: docId }))
      })),
      runTransaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx))
    };
    service = new ProfileAttributionService(() => mockProfilesDb);
  });

  it('generates an opaque 32-byte capability and creates attribution record', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('profiles/')) {
        return {
          exists: true,
          data: () => ({
            profileUid: 'prof_1234567890ab',
            ownerUid: 'user_1',
            displayName: 'Apex',
            ageGroup: 'Young adults (18–25)',
            revision: 1
          })
        };
      }
      return { exists: false };
    });

    const result = await service.initializeAttribution({
      sessionId: 'sess_1',
      ownerUid: 'user_1',
      profileUid: 'prof_1234567890ab'
    });

    expect(result.rawCapability).toHaveLength(64); // 32 bytes hex encoded = 64 chars
    expect(result.ageGroupSnapshot).toBe('Young adults (18–25)');
    expect(mockTx.set).toHaveBeenCalledTimes(2); // attribution doc & capability doc
  });

  it('verifies and consumes a capability atomically, returning attribution snapshots', async () => {
    const rawCapability = 'a'.repeat(64);
    const tokenHash = service.hashCapability(rawCapability);

    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('sessionCapabilities/')) {
        return {
          exists: true,
          data: () => ({
            tokenHash,
            sessionId: 'sess_1',
            status: 'active',
            expiresAt: Date.now() + 3600000 // 1 hour in future
          })
        };
      }
      if (ref.path.startsWith('assessmentAttributions/')) {
        return {
          exists: true,
          data: () => ({
            sessionId: 'sess_1',
            profileUid: 'prof_1234567890ab',
            ownerUid: 'user_1',
            displayNameSnapshot: 'Apex',
            ageGroupSnapshot: 'Young adults (18–25)',
            status: 'active'
          })
        };
      }
      return { exists: false };
    });

    const res = await service.verifyAndConsumeCapability({
      rawCapability,
      sessionId: 'sess_1',
      ownerUid: 'user_1'
    });

    expect(res.valid).toBe(true);
    expect(res.profileUid).toBe('prof_1234567890ab');
    expect(res.displayNameSnapshot).toBe('Apex');
    expect(res.ageGroupSnapshot).toBe('Young adults (18–25)');
    expect(mockTx.update).toHaveBeenCalledTimes(2); // capability consumed, attribution submitted
  });

  it('rejects expired capabilities with clean error', async () => {
    const rawCapability = 'b'.repeat(64);
    const tokenHash = service.hashCapability(rawCapability);

    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('sessionCapabilities/')) {
        return {
          exists: true,
          data: () => ({
            tokenHash,
            sessionId: 'sess_1',
            status: 'active',
            expiresAt: Date.now() - 1000 // Expired
          })
        };
      }
      return { exists: false };
    });

    await expect(service.verifyAndConsumeCapability({
      rawCapability,
      sessionId: 'sess_1',
      ownerUid: 'user_1'
    })).rejects.toThrowError(/CAPABILITY_EXPIRED/);
  });
});
