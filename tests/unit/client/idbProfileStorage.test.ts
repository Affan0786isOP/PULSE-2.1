import { describe, it, expect, beforeEach } from 'vitest';
import { IdbProfileStorage } from '../../../src/lib/profiles/idbProfileStorage';

describe('IdbProfileStorage', () => {
  let storage: IdbProfileStorage;

  beforeEach(() => {
    storage = new IdbProfileStorage('test_owner_1');
  });

  it('stores and retrieves profiles partitioned by ownerUid in in-memory fallback', async () => {
    await storage.saveProfile({
      profileUid: 'prof_test12345678',
      displayName: 'Nova',
      ageGroup: 'Young adults (18–25)' as any,
      themeAccent: 'cyan',
      avatarGlyph: 'reticle',
      shareAgeGroup: true,
      revision: 1
    });

    const profiles = await storage.getProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].displayName).toBe('Nova');
    expect(profiles[0].themeAccent).toBe('cyan');

    // Test partition isolation
    const otherStorage = new IdbProfileStorage('test_owner_2');
    const otherProfiles = await otherStorage.getProfiles();
    expect(otherProfiles).toHaveLength(0);
  });

  it('stores and retrieves active profile selection', async () => {
    await storage.setActiveProfileUid('prof_test12345678');
    const active = await storage.getActiveProfileUid();
    expect(active).toBe('prof_test12345678');
  });

  it('deletes local profile cleanly', async () => {
    await storage.saveProfile({
      profileUid: 'prof_test12345678',
      displayName: 'Nova',
      ageGroup: 'Young adults (18–25)' as any,
      themeAccent: 'cyan',
      avatarGlyph: 'reticle',
      shareAgeGroup: true,
      revision: 1
    });

    await storage.deleteProfile('prof_test12345678');
    const profiles = await storage.getProfiles();
    expect(profiles).toHaveLength(0);
  });
});
