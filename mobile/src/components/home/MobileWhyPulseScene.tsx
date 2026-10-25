import React from 'react';
import { Target, Repeat, Eye } from 'lucide-react';

export function MobileWhyPulseScene() {
  return (
    <section
      id="why-pulse"
      aria-label="Core Engineering Principles"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          METHODOLOGY
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
          Why PULSE
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Engineered to isolate timing sources and maintain transparent, reproducible benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <Target size={16} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Precision Architecture
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              Standardized rendering scheduling reduces frame jitter before calculating trial completion timestamps.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <Repeat size={16} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Repeatable Task Batteries
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              Identical randomization seeds and strict trial invalidation (e.g., false-start rejections under 80ms) prevent skewed results.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <Eye size={16} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Clarity & Transparency
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              Full transparency on measurement boundaries without black-box adjustments or fabricated user rankings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
