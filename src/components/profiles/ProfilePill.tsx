import React from 'react';
import type { LocalProfile } from '../../lib/profiles/idbProfileStorage';
import { VALID_OBSERVATORY_THEMES } from '../../../shared/contracts/profiles';

interface ProfilePillProps {
  activeProfile: LocalProfile | null;
  onOpenManager: () => void;
}

export const ProfilePill: React.FC<ProfilePillProps> = ({ activeProfile, onOpenManager }) => {
  if (!activeProfile) {
    return null;
  }

  const theme = VALID_OBSERVATORY_THEMES.find(t => t.id === activeProfile.themeAccent) || VALID_OBSERVATORY_THEMES[0];

  return (
    <button
      onClick={onOpenManager}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-900/80 hover:bg-slate-800 transition-all text-xs font-mono text-slate-200 ${theme.borderClass}`}
      title="Active Profile (Click to manage)"
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: theme.hex }}
      />
      <span className="font-semibold max-w-[120px] truncate">{activeProfile.displayName}</span>
    </button>
  );
};
