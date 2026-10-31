import React from 'react';
import { useProfiles } from '../../lib/profiles/ProfileContext';
import { ProfileManager } from './ProfileManager';
import { PageShell } from '../layout/PageShell';
import { HomeFooter } from '../home/HomeFooter';
import { exportEncryptedProfileBackup, importEncryptedProfileBackup } from '../../lib/profiles/profileCryptoBackup';

export const ProfilesPage: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { profiles, activeProfile, setActiveProfile, createProfile, deleteProfile } = useProfiles();

  const handleExportBackup = async () => {
    const pass = window.prompt('Enter a secure passphrase to encrypt your profile backup:');
    if (!pass || !pass.trim()) return;
    try {
      const json = await exportEncryptedProfileBackup(profiles, pass.trim());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulse-profiles-backup-${new Date().toISOString().substring(0, 10)}.pulse-backup`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImportBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pulse-backup,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const pass = window.prompt('Enter the passphrase used to encrypt this backup:');
      if (!pass) return;
      try {
        const restored = await importEncryptedProfileBackup(text, pass);
        for (const p of restored) {
          await createProfile({
            displayName: p.displayName,
            ageGroup: p.ageGroup,
            themeAccent: p.themeAccent,
            avatarGlyph: p.avatarGlyph,
            shareAgeGroup: p.shareAgeGroup
          });
        }
        alert(`Successfully imported ${restored.length} profiles.`);
      } catch (err: unknown) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'Invalid passphrase or file corrupted'}`);
      }
    };
    input.click();
  };

  return (
    <PageShell
      currentView="profiles"
      customTitle="Participant Profiles | PULSE"
      customDescription="Manage local participant profiles, Observatory color themes, and export encrypted profile archives."
      onNavigate={onNavigate}
      maxWidth="5xl"
    >
      <div className="w-full pt-8 pb-12">
        <ProfileManager
          profiles={profiles}
          activeProfileUid={activeProfile?.profileUid || null}
          onSelectProfile={setActiveProfile}
          onCreateProfile={async (p) => { await createProfile(p); }}
          onDeleteProfile={deleteProfile}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      </div>
      <HomeFooter />
    </PageShell>
  );
};
