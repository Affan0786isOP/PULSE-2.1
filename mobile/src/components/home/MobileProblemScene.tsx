import React from 'react';
import { AlertCircle, Monitor, Smartphone, Cpu } from 'lucide-react';

export function MobileProblemScene() {
  return (
    <section
      id="browser-timing"
      aria-label="Browser Timing Disclosures & Hardware Limits"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          TRANSPARENCY
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
          Browser Timing & Hardware Limits
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Every web-based cognitive evaluation operates within unavoidable device and browser constraints.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <Monitor size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Display Refresh Intervals
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Standard 60Hz mobile screens refresh every ~16.6ms, while 120Hz displays refresh every ~8.3ms. This quantization naturally quantizes visual stimulus onset.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Smartphone size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Touch Digitizer Sampling
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Capacitive touchscreens report input events at 120Hz to 240Hz, introducing hardware-level input latency that differs from mechanical keyboards.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Cpu size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Background Workloads
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Main thread garbage collection and background OS tasks can introduce brief scheduling pauses during trial transitions.
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-start gap-2 mt-2">
          <AlertCircle size={14} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
            Because of these hardware variables, comparative assessments are best conducted on the same device under consistent conditions.
          </p>
        </div>
      </div>
    </section>
  );
}
