import React from 'react';
import type { LocalProfile } from '../../lib/profiles/idbProfileStorage';
import { VALID_OBSERVATORY_THEMES } from '../../../shared/contracts/profiles';

interface ProfileCardProps {
  profile: LocalProfile;
  isActive: boolean;
  onSelect: (uid: string) => void;
  onDelete: (uid: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isActive,
  onSelect,
  onDelete
}) => {
  const theme = VALID_OBSERVATORY_THEMES.find(t => t.id === profile.themeAccent) || VALID_OBSERVATORY_THEMES[0];

  return (
    <div
      onClick={() => onSelect(profile.profileUid)}
      className={`relative p-5 rounded-xl border transition-all cursor-pointer bg-[var(--surface-1,#12161B)] ${
        isActive
          ? `${theme.borderClass} shadow-lg ring-1 ring-cyan-400/30`
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
            style={{ backgroundColor: `${theme.hex}20`, color: theme.hex, border: `1px solid ${theme.hex}50` }}
          >
            {profile.displayName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{profile.displayName}</h3>
            <p className="text-xs text-slate-400 font-mono">{profile.ageGroup}</p>
          </div>
        </div>

        {isActive && (
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            Active Profile
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <span className="font-mono">{theme.label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(profile.profileUid);
          }}
          className="text-rose-400 hover:text-rose-300 transition-colors p-1"
          title="Delete Profile"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
