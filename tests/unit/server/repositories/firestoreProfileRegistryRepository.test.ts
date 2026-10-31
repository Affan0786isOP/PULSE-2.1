import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirestoreProfileRegistryRepository } from '../../../../server/repositories/firestore/firestoreProfileRegistryRepository';

describe('FirestoreProfileRegistryRepository', () => {
  let mockDb: any;
  let mockTx: any;
  let repo: FirestoreProfileRegistryRepository;

  beforeEach(() => {
    mockTx = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    mockDb = {
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({ path: `${colName}/${docId}`, id: docId }))
      })),
      runTransaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx))
    };
    repo = new FirestoreProfileRegistryRepository(() => mockDb);
  });

  it('atomically reserves a profile name and increments account profileCount', async () => {
    // 1. Account document: current profileCount = 0
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/')) {
        return { exists: true, data: () => ({ ownerUid: 'user1', profileCount: 0, profileUids: [] }) };
      }
      if (ref.path.startsWith('names/')) {
        return { exists: false };
      }
      return { exists: false };
    });

    const result = await repo.reserveProfile({
      ownerUid: 'user1',
      displayName: 'Nova Pilot',
      ageGroup: 'Young adults (18–25)',
      shareAgeGroupOnLeaderboard: true
    });

    expect(result.success).toBe(true);
    expect(result.profile.displayName).toBe('Nova Pilot');
    expect(result.profile.normalizedName).toBe('nova pilot');
    expect(result.profile.profileUid).toHaveLength(16);
    expect(mockTx.set).toHaveBeenCalledTimes(2); // profile doc & name doc
    expect(mockTx.update).toHaveBeenCalledTimes(1); // account doc updated
  });

  it('rejects reservation when account has already reached 5 profiles', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/')) {
        return {
          exists: true,
          data: () => ({
            ownerUid: 'user1',
            profileCount: 5,
            profileUids: ['p1', 'p2', 'p3', 'p4', 'p5']
          })
        };
      }
      return { exists: false };
    });

    await expect(repo.reserveProfile({
      ownerUid: 'user1',
      displayName: 'Nova 6',
      ageGroup: 'Adults (26–40)',
      shareAgeGroupOnLeaderboard: false
    })).rejects.toThrowError(/PROFILE_LIMIT_EXCEEDED/);
  });

  it('rejects reservation when name is already actively reserved', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/')) {
        return { exists: true, data: () => ({ ownerUid: 'user1', profileCount: 1, profileUids: ['p1'] }) };
      }
      if (ref.path.startsWith('names/')) {
        return { exists: true, data: () => ({ status: 'active', profileUid: 'p0' }) };
      }
      return { exists: false };
    });

    await expect(repo.reserveProfile({
      ownerUid: 'user1',
      displayName: 'Nova Pilot',
      ageGroup: 'Adults (26–40)',
      shareAgeGroupOnLeaderboard: false
    })).rejects.toThrowError(/NAME_ALREADY_TAKEN/);
  });
});
