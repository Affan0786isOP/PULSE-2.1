import React from 'react';
import type { LocalProfile } from '../../lib/profiles/idbProfileStorage';
import { VALID_OBSERVATORY_THEMES } from '../../../shared/contracts/profiles';

interface ProfileSelectorPreFlightProps {
  profiles: LocalProfile[];
  activeProfileUid: string | null;
  onSelectAndStart: (profile: LocalProfile | null) => void;
  onManageProfiles: () => void;
  onCancel?: () => void;
}

export const ProfileSelectorPreFlight: React.FC<ProfileSelectorPreFlightProps> = ({
  profiles,
  activeProfileUid,
  onSelectAndStart,
  onManageProfiles
}) => {
  return (
    <div className="bg-[var(--surface-0,#0B0D10)] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl mx-auto my-6 text-center">
      <h2 className="text-xl font-bold text-slate-100 tracking-tight">Participant Confirmation</h2>
      <p className="text-xs text-slate-400 mt-1 mb-6">
        Click a profile to start, or continue as guest.
      </p>

      {profiles.length > 0 ? (
        <div className="space-y-3 mb-6">
          <div className="flex flex-col gap-2">
            {profiles.map(p => {
              const pTheme = VALID_OBSERVATORY_THEMES.find(t => t.id === p.themeAccent) || VALID_OBSERVATORY_THEMES[0];
              const isActive = p.profileUid === activeProfileUid;
              return (
                <button
                  key={p.profileUid}
                  type="button"
                  onClick={() => onSelectAndStart(p)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? `${pTheme.borderClass} bg-slate-900 ring-1 ring-cyan-400/40 hover:bg-slate-800/80`
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
                      style={{ backgroundColor: `${pTheme.hex}20`, color: pTheme.hex }}
                    >
                      {p.displayName.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{p.displayName}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.ageGroup}</div>
                    </div>
                  </div>
                  <span className="text-cyan-400 hover:text-cyan-300 font-mono text-xs flex items-center gap-1">
                    {isActive ? 'Active • Play' : 'Play'} →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6 border border-dashed border-slate-800 rounded-xl mb-6 flex flex-col items-center">
          <p className="text-xs text-slate-400">No participant profiles found on this device.</p>
          <button
            type="button"
            onClick={onManageProfiles}
            className="mt-2.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
          >
            + Create a Profile
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onSelectAndStart(null)}
          className="w-full py-2.5 rounded-xl font-mono text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
};
