import React from 'react';
import type { BreakUiDatasetMode } from '@shared/dataset/breakUiFixtures';

interface BreakUiToggleProps {
  currentMode: BreakUiDatasetMode;
  onSelectMode: (mode: BreakUiDatasetMode) => void;
}

const MODES: { id: BreakUiDatasetMode; label: string }[] = [
  { id: 'demo', label: 'Demo' },
  { id: 'worst', label: 'Worst case' },
  { id: 'empty', label: 'Empty' },
  { id: 'one', label: 'One' },
  { id: 'huge', label: 'Huge' },
];

export function BreakUiToggle({ currentMode, onSelectMode }: BreakUiToggleProps) {
  return (
    <div
      role="region"
      aria-label="Break UI Dataset Switcher"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-full bg-slate-900/95 dark:bg-black/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-[11px] font-sans pointer-events-auto"
    >
      <span className="text-[10px] font-mono uppercase px-2 text-slate-400 font-medium select-none">
        BREAK-UI:
      </span>
      {MODES.map((m) => {
        const isActive = currentMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMode(m.id)}
            className={`px-2.5 py-1 rounded-full transition-all duration-150 font-medium whitespace-nowrap ${
              isActive
                ? 'bg-white text-slate-950 font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
