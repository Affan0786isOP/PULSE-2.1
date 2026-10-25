import React from 'react';
import { Activity, Zap, CheckCircle2 } from 'lucide-react';

export function MobileResultScene() {
  return (
    <section
      id="sample-result"
      aria-label="Sample Assessment Result"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          METRIC BREAKDOWN
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
          Understand Your Scores
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Completed sessions break down your raw millisecond latency into central tendency and trial consistency.
        </p>
      </div>

      {/* Illustrative Result Card */}
      <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[9.5px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider block">
              SAMPLE RECORD (ILLUSTRATIVE)
            </span>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Visual Reaction Task
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[10px] font-mono font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            5 Trials
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide font-medium flex items-center gap-1">
              <Zap size={11} className="text-[var(--accent)]" aria-hidden="true" /> Mean Latency
            </span>
            <span className="font-heading text-lg font-extrabold text-[var(--text-primary)] mt-0.5">
              214 <span className="text-xs font-normal text-[var(--text-secondary)]">ms</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide font-medium flex items-center gap-1">
              <Activity size={11} className="text-[var(--accent)]" aria-hidden="true" /> Variance (SD)
            </span>
            <span className="font-heading text-lg font-extrabold text-[var(--text-primary)] mt-0.5">
              ±18.4 <span className="text-xs font-normal text-[var(--text-secondary)]">ms</span>
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border-subtle)] flex items-start gap-2">
          <CheckCircle2 size={14} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Variance indicates response stability across rounds, separating deliberate consistency from erratic guesses.
          </p>
        </div>
      </div>
    </section>
  );
}
