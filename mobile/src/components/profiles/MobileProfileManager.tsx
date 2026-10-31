import React from 'react';
import type { LocalProfile } from '@shared/contracts/profiles';
import { VALID_OBSERVATORY_THEMES } from '@shared/contracts/profiles';

interface MobileProfileManagerProps {
  profiles: LocalProfile[];
  activeProfileUid: string | null;
  onSelectProfile: (uid: string) => void;
  onDeleteProfile: (uid: string) => Promise<void>;
  onClose: () => void;
}

export const MobileProfileManager: React.FC<MobileProfileManagerProps> = ({
  profiles,
  activeProfileUid,
  onSelectProfile,
  onDeleteProfile,
  onClose
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-0,#0B0D10)] text-slate-100 p-4 safe-area-inset font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold">Participant Profiles</h2>
          <span className="text-xs text-slate-400 font-mono">({profiles.length}/5 profiles)</span>
        </div>
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 text-sm font-mono"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {profiles.map(p => {
          const theme = VALID_OBSERVATORY_THEMES.find(t => t.id === p.themeAccent) || VALID_OBSERVATORY_THEMES[0];
          const isActive = p.profileUid === activeProfileUid;

          return (
            <div
              key={p.profileUid}
              onClick={() => {
                triggerHaptic();
                onSelectProfile(p.profileUid);
              }}
              className={`p-4 rounded-xl border flex items-center justify-between min-h-[56px] transition-all cursor-pointer ${
                isActive
                  ? `${theme.borderClass} bg-slate-900 ring-1 ring-cyan-400/40`
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                  style={{ backgroundColor: `${theme.hex}20`, color: theme.hex }}
                >
                  {p.displayName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{p.displayName}</div>
                  <div className="text-xs text-slate-400 font-mono">{p.ageGroup}</div>
                </div>
              </div>

              {isActive && (
                <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                  Active
                </span>
              )}
            </div>
          );
        })}

        {profiles.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-400 text-sm">No profiles found.</p>
            <p className="text-slate-500 text-xs mt-1">PULSE remains 100% usable as a guest.</p>
          </div>
        )}
      </div>
    </div>
  );
};
