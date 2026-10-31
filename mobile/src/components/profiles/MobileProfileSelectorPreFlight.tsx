import React from 'react';
import type { LocalProfile } from '@shared/contracts/profiles';
import { VALID_OBSERVATORY_THEMES } from '@shared/contracts/profiles';

interface MobileProfileSelectorPreFlightProps {
  profiles: LocalProfile[];
  activeProfileUid: string | null;
  onSelectAndStart: (profile: LocalProfile | null) => void;
  onManageProfiles: () => void;
  onCancel?: () => void;
}

export const MobileProfileSelectorPreFlight: React.FC<MobileProfileSelectorPreFlightProps> = ({
  profiles,
  activeProfileUid,
  onSelectAndStart,
  onManageProfiles,
  onCancel
}) => {
  const [selectedUid, setSelectedUid] = React.useState<string | null>(
    activeProfileUid || (profiles.length > 0 ? profiles[0].profileUid : null)
  );

  const selectedProfile = profiles.find(p => p.profileUid === selectedUid) || null;

  return (
    <div className="flex flex-col flex-1 justify-between p-4 max-w-md w-full mx-auto select-none font-sans">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Participant Profile</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose who is taking this test</p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto py-1">
            {profiles.map(p => {
              const pTheme = VALID_OBSERVATORY_THEMES.find(t => t.id === p.themeAccent) || VALID_OBSERVATORY_THEMES[0];
              const isChosen = p.profileUid === selectedUid;
              return (
                <button
                  key={p.profileUid}
                  type="button"
                  onClick={() => setSelectedUid(p.profileUid)}
                  className={`w-full min-h-[48px] p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                    isChosen
                      ? 'border-[#0066FF] dark:border-cyan-400 bg-blue-50/70 dark:bg-cyan-950/20 shadow-xs ring-1 ring-[#0066FF] dark:ring-cyan-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181D23]'
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
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.displayName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.ageGroup}</div>
                    </div>
                  </div>
                  {isChosen && (
                    <span className="text-xs font-mono font-semibold text-[#0066FF] dark:text-cyan-400">Selected</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">No participant profiles found on this device.</p>
            <button
              type="button"
              onClick={onManageProfiles}
              className="text-xs font-mono text-[#0066FF] dark:text-cyan-400 underline min-h-[44px] inline-flex items-center"
            >
              + Create a Profile
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          disabled={!selectedProfile && profiles.length > 0}
          onClick={() => onSelectAndStart(selectedProfile)}
          className="w-full min-h-[48px] rounded-xl font-mono text-sm font-semibold bg-[#0066FF] dark:bg-cyan-500 text-white dark:text-slate-950 flex items-center justify-center shadow-md disabled:opacity-50"
        >
          {selectedProfile ? `Start as ${selectedProfile.displayName}` : 'Start Assessment'}
        </button>

        <button
          type="button"
          onClick={() => onSelectAndStart(null)}
          className="w-full min-h-[44px] rounded-xl font-mono text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center"
        >
          Continue as Guest (Manual Age Selection)
        </button>
      </div>
    </div>
  );
};
