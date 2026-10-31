import React from 'react';
import { ProfileCard } from './ProfileCard';
import type { LocalProfile } from '../../lib/profiles/idbProfileStorage';
import { VALID_OBSERVATORY_THEMES, VALID_OBSERVATORY_GLYPHS } from '../../../shared/contracts/profiles';

interface ProfileManagerProps {
  profiles: LocalProfile[];
  activeProfileUid: string | null;
  onSelectProfile: (uid: string) => void;
  onCreateProfile: (profile: Omit<LocalProfile, 'profileUid' | 'revision'>) => Promise<void>;
  onDeleteProfile: (uid: string) => Promise<void>;
  onExportBackup?: () => void;
  onImportBackup?: () => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfileUid,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onExportBackup,
  onImportBackup
}) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('');
  const [ageGroup, setAgeGroup] = React.useState('Adults (26–40)');
  const [themeAccent, setThemeAccent] = React.useState<any>('cyan');
  const [avatarGlyph, setAvatarGlyph] = React.useState<any>('reticle');
  const [shareAgeGroup, setShareAgeGroup] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const canCreate = profiles.length < 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !canCreate) return;
    setSubmitting(true);
    try {
      await onCreateProfile({
        displayName: displayName.trim(),
        ageGroup: ageGroup as any,
        themeAccent,
        avatarGlyph,
        shareAgeGroup
      });
      setShowCreateModal(false);
      setDisplayName('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Participant Profiles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Optional local profiles for identifying your assessment trials and leaderboard scores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
            >
              Export Backup
            </button>
          )}
          {onImportBackup && (
            <button
              onClick={onImportBackup}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
            >
              Restore Backup
            </button>
          )}
          <button
            disabled={!canCreate}
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all ${
              canCreate
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            + Create Profile ({profiles.length}/5)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {profiles.map(p => (
          <ProfileCard
            key={p.profileUid}
            profile={p}
            isActive={p.profileUid === activeProfileUid}
            onSelect={onSelectProfile}
            onDelete={onDeleteProfile}
          />
        ))}

        {profiles.length === 0 && (
          <div className="col-span-2 text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-400 text-sm">No profiles created yet.</p>
            <p className="text-slate-500 text-xs mt-1">PULSE remains 100% usable as a guest without creating profiles.</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-0,#0B0D10)] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">Create Participant Profile</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Display Name (3-20 chars)</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Nova"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Theme Accent</label>
                <div className="flex gap-2">
                  {VALID_OBSERVATORY_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeAccent(theme.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        themeAccent === theme.id ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: theme.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="shareAge"
                  checked={shareAgeGroup}
                  onChange={e => setShareAgeGroup(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <label htmlFor="shareAge" className="text-xs text-slate-300">
                  Share age group on public leaderboard
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
                >
                  {submitting ? 'Creating...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
