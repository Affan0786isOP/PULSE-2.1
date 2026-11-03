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
    expect(result.profile.discriminator).toMatch(/^\d{4}$/);
    expect(result.profile.leaderboardDisplayName).toContain('Nova Pilot #');
    expect(mockTx.set).toHaveBeenCalledTimes(1); // profile doc
    expect(mockTx.update).toHaveBeenCalledTimes(1); // account doc updated
  });

  it('rejects reservation when account has already reached 10 profiles', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/')) {
        return {
          exists: true,
          data: () => ({
            ownerUid: 'user1',
            profileCount: 10,
            profileUids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']
          })
        };
      }
      return { exists: false };
    });

    await expect(repo.reserveProfile({
      ownerUid: 'user1',
      displayName: 'Nova 11',
      ageGroup: 'Adults (26–40)',
      shareAgeGroupOnLeaderboard: false
    })).rejects.toThrowError(/PROFILE_LIMIT_EXCEEDED/);
  });

  it('rejects reservation when the same user already has a profile with that name', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/')) {
        return { exists: true, data: () => ({ ownerUid: 'user1', profileCount: 1, profileUids: ['p1'] }) };
      }
      if (ref.path === 'profiles/p1') {
        return { exists: true, data: () => ({ profileUid: 'p1', normalizedName: 'nova pilot' }) };
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

  it('allows different accounts to use the same profile display name', async () => {
    mockTx.get.mockImplementation(async (ref: any) => {
      if (ref.path.startsWith('accounts/user2')) {
        return { exists: true, data: () => ({ ownerUid: 'user2', profileCount: 0, profileUids: [] }) };
      }
      return { exists: false };
    });

    const result = await repo.reserveProfile({
      ownerUid: 'user2',
      displayName: 'Nova Pilot',
      ageGroup: 'Adults (26–40)',
      shareAgeGroupOnLeaderboard: true
    });

    expect(result.success).toBe(true);
    expect(result.profile.displayName).toBe('Nova Pilot');
    expect(result.profile.ownerUid).toBe('user2');
  });
});
