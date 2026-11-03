import React from 'react';
import { useProfiles } from '../../lib/profiles/ProfileContext';
import { ProfileManager } from './ProfileManager';
import { PageShell } from '../layout/PageShell';
import { HomeFooter } from '../home/HomeFooter';
import { exportEncryptedProfileBackup, importEncryptedProfileBackup } from '../../lib/profiles/profileCryptoBackup';

export const ProfilesPage: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { profiles, activeProfile, setActiveProfile, createProfile, deleteProfile, isGoogleUser, user, signInWithGoogle, signOut } = useProfiles();

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
        {!isGoogleUser ? (
          <div className="max-w-4xl mx-auto mb-6 p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <h2 className="text-base font-bold text-slate-100">Sign in with Google to create profiles</h2>
              <p className="text-xs text-slate-400 mt-0.5">Link up to 10 participant profiles to your email and sync them across all devices.</p>
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-sm font-semibold shadow-md shadow-cyan-500/20 shrink-0 transition-all cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto mb-6 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs font-mono">
            <div className="text-slate-300">
              Signed in as <span className="text-cyan-400 font-semibold">{user?.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
        <ProfileManager
          profiles={profiles}
          activeProfileUid={activeProfile?.profileUid || null}
          onSelectProfile={setActiveProfile}
          onCreateProfile={async (p) => {
            if (!isGoogleUser) {
              await signInWithGoogle();
            }
            await createProfile(p);
          }}
          onDeleteProfile={deleteProfile}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      </div>
      <HomeFooter />
    </PageShell>
  );
};
