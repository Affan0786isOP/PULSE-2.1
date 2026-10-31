import { describe, it, expect } from 'vitest';
import {
  exportEncryptedProfileBackup,
  importEncryptedProfileBackup
} from '../../../src/lib/profiles/profileCryptoBackup';

describe('ProfileCryptoBackup (AES-GCM Web Crypto)', () => {
  it('encrypts local profile backup and restores with correct passphrase', async () => {
    const profiles: any[] = [
      {
        profileUid: 'prof_test12345678',
        displayName: 'Nova Pilot',
        ageGroup: 'Young adults (18–25)',
        themeAccent: 'cyan',
        avatarGlyph: 'reticle',
        shareAgeGroup: true,
        revision: 1
      }
    ];

    const encryptedJson = await exportEncryptedProfileBackup(profiles, 'SecurePass123!');
    expect(encryptedJson).toContain('"version": 1');
    expect(encryptedJson).toContain('"algorithm": "AES-GCM"');

    const restored = await importEncryptedProfileBackup(encryptedJson, 'SecurePass123!');
    expect(restored).toHaveLength(1);
    expect(restored[0].displayName).toBe('Nova Pilot');
  });

  it('rejects decryption when wrong passphrase is provided', async () => {
    const profiles: any[] = [{ profileUid: 'p1', displayName: 'Apex' }];
    const encryptedJson = await exportEncryptedProfileBackup(profiles, 'RightPassword');

    await expect(
      importEncryptedProfileBackup(encryptedJson, 'WrongPassword')
    ).rejects.toThrow();
  });
});
