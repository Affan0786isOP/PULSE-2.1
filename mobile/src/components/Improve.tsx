import React, { useState, useEffect } from "react";
import { motion } from 'motion/react';
import { Navbar } from "./Navbar";
import {
  PHYSIOLOGICAL_FACTORS,
  PREPARATION_HABITS,
  getRandomizedResearchEntries,
  loadPersistedChecklist,
  savePersistedChecklist,
  clearPersistedChecklist,
  ResearchEntry,
  EvidenceType,
} from "../data/facts";
import { SEO } from "./SEO";
import { isReducedMotionActive, playAudioCue } from "../lib/settingsStore";
import {
  Moon,
  Droplet,
  Activity,
  User,
  Target,
  Dumbbell,
  Apple,
  Brain,
  Monitor,
  Coffee,
  Check,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  BookOpen,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const FACTOR_ICONS: Record<string, React.ElementType> = {
  Moon,
  Droplet,
  Activity,
  User,
  Target,
  Dumbbell,
  Apple,
  Brain,
  Monitor,
  Coffee,
};

function getEvidenceBadge(type: EvidenceType) {
  switch (type) {
    case "established":
      return {
        label: "Established Evidence",
        className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      };
    case "association":
      return {
        label: "Statistical Association",
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    case "interpretation":
      return {
        label: "Theoretical Model",
        className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      };
    case "practical_protocol":
      return {
        label: "Practical Protocol",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    default:
      return {
        label: "Scientific Finding",
        className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      };
  }
}

export function Improve({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => loadPersistedChecklist());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [researchEntries] = useState<ResearchEntry[]>(() => getRandomizedResearchEntries());
  const [isLedgerPaused, setIsLedgerPaused] = useState(false);
  const [ledgerTimerReset, setLedgerTimerReset] = useState(0);

  const toggleChecklist = (index: number) => {
    playAudioCue("click");
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      savePersistedChecklist(next);
      return next;
    });
  };

  const handleResetChecklist = () => {
    playAudioCue("click");
    clearPersistedChecklist();
    setCheckedItems(new Set());
  };

  const habitCompletionPercentage = Math.round(
    (checkedItems.size / PREPARATION_HABITS.length) * 100,
  );

  useEffect(() => {
    if (isLedgerPaused || isReducedMotionActive()) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % researchEntries.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [researchEntries.length, isLedgerPaused, ledgerTimerReset]);

  const handlePrevSlide = () => {
    playAudioCue("click");
    setCurrentSlide((prev) => (prev - 1 + researchEntries.length) % researchEntries.length);
    setLedgerTimerReset((c) => c + 1);
  };

  const handleNextSlide = () => {
    playAudioCue("click");
    setCurrentSlide((prev) => (prev + 1) % researchEntries.length);
    setLedgerTimerReset((c) => c + 1);
  };

  const activeEntry = researchEntries[currentSlide] || researchEntries[0];
  const activeEvidence = getEvidenceBadge(activeEntry.evidenceType);

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <SEO 
        title="Calibrating & Improving Input Latency | PULSE Mobile"
        description="Evidence-based research, physiological variables, and habit preparation protocols to support response consistency and minimize latency."
      />
      {/* Navbar Header */}
      <Navbar currentView="improve" onNavigate={onNavigate} title="IMPROVE" />

      <main 
        className="flex-1 overflow-y-auto bg-transparent relative pt-4 pb-20 pb-safe px-safe"
        style={{
          paddingBottom: 'max(5rem, calc(2rem + env(safe-area-inset-bottom, 0px)))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mx-auto px-4 relative z-10 flex flex-col gap-5"
        >
          {/* Header Banner */}
          <div className="text-center pt-2 pb-2 border-b border-[var(--border-subtle)]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--accent)] text-[11px] font-mono mb-1.5">
              <Sparkles size={12} />
              <span>SCIENTIFIC PROTOCOL</span>
            </div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Improve Speed &amp; Focus
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1 leading-relaxed">
              Evidence-based habits and physiological factors to sustain test-retest consistency.
            </p>
          </div>

          {/* Section 1: Variable Matrix */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                VARIABLE MATRIX
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                What Affects Performance?
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {/* Hinders */}
              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[var(--danger)] font-mono text-[10px] font-semibold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                  <span>Associated with Higher Latency</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHYSIOLOGICAL_FACTORS.filter(f => f.impact === 'associated_increase' || (f.impact === undefined && f.reduces)).map((factor) => (
                    <span
                      key={factor.id}
                      className="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 text-[11px] px-2 py-0.5 rounded font-sans"
                    >
                      {factor.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Supports */}
              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[var(--success)] font-mono text-[10px] font-semibold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  <span>Supports Response Consistency</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHYSIOLOGICAL_FACTORS.filter(f => f.impact === 'supports_consistency' || (f.impact === undefined && !f.reduces)).map((factor) => (
                    <span
                      key={factor.id}
                      className="bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 text-[11px] px-2 py-0.5 rounded font-sans"
                    >
                      {factor.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Action Checklist Protocol */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                  DAILY HABITS
                </span>
                <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                  Daily Habit Preparation
                </h2>
              </div>
              {checkedItems.size > 0 && (
                <button
                  type="button"
                  onClick={handleResetChecklist}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-secondary)] font-medium">HABITS CHECKED</span>
                <span className="text-[var(--accent)] font-semibold">
                  {checkedItems.size} / {PREPARATION_HABITS.length} ({habitCompletionPercentage}%)
                </span>
              </div>

              <div className="w-full h-1.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${habitCompletionPercentage}%` }}
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                {PREPARATION_HABITS.map((item, index) => {
                  const isChecked = checkedItems.has(index);
                  return (
                    <button
                      key={`mobile-chk-${item.id}-${index}`}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`${item.title}: ${item.desc}`}
                      onClick={() => toggleChecklist(index)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        isChecked
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--text-primary)]"
                          : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 pr-2">
                        <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{item.title}</span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase px-1 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)]">
                            {item.category}
                          </span>
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] leading-tight">
                          {item.desc}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-[var(--accent)] text-slate-950 font-bold"
                            : "border border-[var(--border-strong)] bg-transparent text-transparent"
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                <ShieldCheck size={12} className="text-[var(--accent)] shrink-0" />
                <span>Habit adherence supports baseline testing consistency.</span>
              </div>
            </div>
          </section>

          {/* Section 3: Research Insight & Findings */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                NEUROSCIENCE FINDING
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Synaptic Insights &amp; Findings
              </h2>
            </div>

            <div 
              onMouseEnter={() => setIsLedgerPaused(true)}
              onMouseLeave={() => setIsLedgerPaused(false)}
              onFocus={() => setIsLedgerPaused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsLedgerPaused(false);
                }
              }}
              className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-col gap-2.5 relative shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit size={14} className="text-[var(--accent)]" />
                  <span className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    {activeEntry.domain}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {(currentSlide + 1).toString().padStart(2, "0")} / {researchEntries.length.toString().padStart(2, "0")}
                </span>
              </div>

              <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border w-fit ${activeEvidence.className}`}>
                {activeEvidence.label}
              </span>

              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans min-h-[44px] flex items-center">
                "{activeEntry.statement}"
              </p>

              {/* Provenance Box */}
              <div className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-md p-2 text-[11px] space-y-1">
                <div className="flex items-center gap-1 text-[var(--text-primary)] font-medium">
                  <BookOpen size={12} className="text-[var(--accent)] shrink-0" />
                  <span>{activeEntry.citation.source} ({activeEntry.citation.year})</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-mono pl-4">
                  {activeEntry.citation.reference}
                </p>
                {activeEntry.citation.doi && (
                  <div className="text-[9px] text-[var(--text-muted)] font-mono pl-4 flex items-center gap-1">
                    <span>DOI: {activeEntry.citation.doi}</span>
                    <ExternalLink size={9} />
                  </div>
                )}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer active:scale-95"
                >
                  <ChevronLeft size={14} />
                  <span>PREV</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer active:scale-95"
                >
                  <span>NEXT OBSERVATION</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* Section 4: Expectation Management */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                EXPECTATION MANAGEMENT
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Can Everyone Improve?
              </h2>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed shadow-sm">
              <p>
                Day-to-day reaction latency varies based on sleep debt, mental fatigue, and input device responsiveness.
              </p>
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-primary)] font-semibold">Practice Effects:</strong> Gains on repetitive benchmark tasks largely reflect task familiarity, stimulus anticipation, and practice effects rather than generalized expansion of innate cognitive capacity.
                </p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-primary)] font-semibold">Age Cohorts:</strong> Response variations across age cohorts reflect normative sensory-motor processing differences across populations.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: System Protocol Tips */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                PRINCIPLES
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                System Recommendations
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {[
                {
                  num: "01",
                  title: "Consistency",
                  desc: "Short daily 5-minute sessions beat occasional long sessions.",
                },
                {
                  num: "02",
                  title: "Accuracy First",
                  desc: "Build consistency before chasing raw latency speed.",
                },
                {
                  num: "03",
                  title: "Peak Readiness",
                  desc: "Test when rested and alert to set true biological baselines.",
                },
                {
                  num: "04",
                  title: "Track Rolling Trends",
                  desc: "Evaluate multi-week rolling averages rather than single trial spikes.",
                },
              ].map((tip) => (
                <div
                  key={tip.num}
                  className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 font-heading text-[var(--accent)] font-semibold text-xs tracking-wider">
                    <span className="font-mono text-[var(--text-muted)]">{tip.num} —</span>
                    <span>{tip.title}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed pl-5">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section className="pt-2 pb-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigate("assessments")}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 rounded-md py-3 px-5 font-medium text-xs tracking-wider uppercase flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer font-bold shadow-sm"
            >
              <span>Take assessments</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="w-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md py-2.5 px-5 font-medium text-xs tracking-wider uppercase flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer"
            >
              Return home
            </button>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

