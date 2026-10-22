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
    <div className="bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] dark:from-[#0B0D10] dark:via-[#0B0D10] dark:to-[#0B0D10] text-[#090D1A] dark:text-[#F5F7FA] min-h-[100dvh] w-full flex flex-col font-sans selection:bg-[#0066FF]/20 relative">
      <SEO />
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
          <div className="text-center pt-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-100 dark:border-slate-700 bg-sky-50 dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] text-[11px] font-mono font-bold mb-2 shadow-2xs">
              <BookOpen size={12} strokeWidth={2.4} />
              <span>PERFORMANCE GUIDE</span>
            </div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-[#090D1A] dark:text-[#F5F7FA]">
              Performance &amp; Consistency
            </h1>
            <p className="text-[#64748B] dark:text-slate-400 text-xs mt-1 leading-relaxed">
              Review the physiological factors and habits that affect response latency and measurement consistency.
            </p>
          </div>

          {/* Section 1: Variable Matrix */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider uppercase block">
                Biological &amp; environmental factors
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[#090D1A] dark:text-[#F5F7FA] uppercase">
                What Affects Performance?
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Hinders */}
              <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/90 dark:border-rose-900/40 rounded-2xl p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-mono text-[10.5px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Associated with Higher Latency</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHYSIOLOGICAL_FACTORS.filter(f => f.impact === 'associated_increase' || (f.impact === undefined && f.reduces)).map((factor) => (
                    <span
                      key={factor.id}
                      className="bg-white dark:bg-[#181D23] text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-[11.5px] px-2.5 py-1 rounded-lg font-medium shadow-2xs"
                    >
                      {factor.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Supports */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/90 dark:border-emerald-900/40 rounded-2xl p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono text-[10.5px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Supports Response Consistency</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHYSIOLOGICAL_FACTORS.filter(f => f.impact === 'supports_consistency' || (f.impact === undefined && !f.reduces)).map((factor) => (
                    <span
                      key={factor.id}
                      className="bg-white dark:bg-[#181D23] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-[11.5px] px-2.5 py-1 rounded-lg font-medium shadow-2xs"
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
                <span className="font-mono text-[10px] font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider uppercase block">
                  Daily habits
                </span>
                <h2 className="font-heading text-xs font-bold tracking-wider text-[#090D1A] dark:text-[#F5F7FA] uppercase">
                  Daily Habit Preparation
                </h2>
              </div>
              {checkedItems.size > 0 && (
                <button
                  type="button"
                  onClick={handleResetChecklist}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#181D23] hover:bg-slate-50 dark:hover:bg-[#20262E] active:scale-95 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 hover:text-[#090D1A] dark:hover:text-white shadow-2xs transition-all cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-[#12161B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#64748B] dark:text-slate-400 font-semibold">HABITS CHECKED</span>
                <span className="text-[#0066FF] dark:text-[#22C7D6] font-bold">
                  {checkedItems.size} / {PREPARATION_HABITS.length} ({habitCompletionPercentage}%)
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="w-full h-full bg-[#0066FF] origin-left transition-transform duration-300 ease-out rounded-full"
                  style={{ transform: `scaleX(${habitCompletionPercentage / 100})` }}
                />
              </div>

              <div className="flex flex-col gap-2 mt-1">
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
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                        isChecked
                          ? "bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-[#090D1A] dark:text-[#F5F7FA] shadow-2xs"
                          : "bg-white dark:bg-[#181D23] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 pr-2">
                        <span className="text-[13px] font-bold text-[#090D1A] dark:text-[#F5F7FA] flex items-center gap-1.5">
                          <span>{item.title}</span>
                          <span className="text-[9.5px] font-mono text-[#0066FF] dark:text-[#22C7D6] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-[#12161B] border border-sky-100 dark:border-slate-700">
                            {item.category}
                          </span>
                        </span>
                        <span className="text-[11.5px] text-[#64748B] dark:text-slate-400 leading-tight font-normal">
                          {item.desc}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isChecked
                            ? "bg-[#0066FF] text-white shadow-xs"
                            : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#181D23] text-transparent"
                        }`}
                      >
                        <Check size={13} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10.5px] text-[#64748B] dark:text-slate-400 font-mono">
                <ShieldCheck size={13} className="text-[#0066FF] shrink-0" />
                <span>Habit adherence supports baseline testing consistency.</span>
              </div>
            </div>
          </section>

          {/* Section 3: Research Insight & Findings */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider uppercase block">
                Research ledger
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[#090D1A] dark:text-[#F5F7FA] uppercase">
                Research findings
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
              className="bg-white dark:bg-[#12161B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex flex-col gap-3 relative"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit size={15} className="text-[#0066FF]" />
                  <span className="font-heading text-xs font-bold text-[#090D1A] dark:text-[#F5F7FA] uppercase tracking-wider">
                    {activeEntry.domain}
                  </span>
                </div>
                <span className="font-mono text-[10.5px] font-semibold text-slate-400">
                  {(currentSlide + 1).toString().padStart(2, "0")} / {researchEntries.length.toString().padStart(2, "0")}
                </span>
              </div>

              <span className="font-mono text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] font-bold w-fit">
                {activeEvidence.label}
              </span>

              <p className="text-[13px] text-[#090D1A] dark:text-[#F5F7FA] leading-relaxed font-sans min-h-[44px] flex items-center font-medium">
                "{activeEntry.statement}"
              </p>

              {/* Provenance Box */}
              <div className="bg-slate-50 dark:bg-[#181D23] border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-[11.5px] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#090D1A] dark:text-[#F5F7FA] font-bold">
                  <BookOpen size={13} className="text-[#0066FF] shrink-0" />
                  <span>{activeEntry.citation.source} ({activeEntry.citation.year})</span>
                </div>
                <p className="text-[10.5px] text-[#64748B] dark:text-slate-400 font-mono pl-5">
                  {activeEntry.citation.reference}
                </p>
                {activeEntry.citation.doi && (
                  <div className="text-[10px] text-[#0066FF] dark:text-[#22C7D6] font-mono pl-5 flex items-center gap-1">
                    <span>DOI: {activeEntry.citation.doi}</span>
                    <ExternalLink size={9} />
                  </div>
                )}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  <ChevronLeft size={14} />
                  <span>PREV</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#0066FF] hover:text-[#0052CC] transition-colors cursor-pointer active:scale-95"
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
              <span className="font-mono text-[10px] font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider uppercase block">
                Expectation management
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[#090D1A] dark:text-[#F5F7FA] uppercase">
                Can you improve your results?
              </h2>
            </div>
            <div className="bg-white dark:bg-[#12161B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,102,255,0.03)] space-y-2 text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              <p>
                Absolute physiological limits set a floor on neural transmission speed, but day-to-day variance depends heavily on focus, sleep, and environmental distractions. You can minimize performance dips and achieve higher consistency by maintaining good sleep habits, minimizing hardware input latency, and practicing the tasks.
              </p>
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Longitudinal gains on benchmark tasks largely reflect task familiarity, stimulus anticipation, and motor pattern learning rather than an expansion of overall cognitive capacity.
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Variations across age cohorts reflect sensory-motor processing differences across populations rather than an absolute indicator of individual biological decline.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: System Protocol Tips */}
          <section className="flex flex-col gap-2.5">
            <div>
              <span className="font-mono text-[10px] font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider uppercase block">
                Best practices
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[#090D1A] dark:text-[#F5F7FA] uppercase">
                How to improve
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {[
                {
                  num: "01",
                  title: "Train consistently",
                  desc: "Short daily sessions of 5-10 minutes build better task familiarity than sporadic long sessions.",
                },
                {
                  num: "02",
                  title: "Incorporate rest",
                  desc: "Avoid back-to-back testing to prevent eye fatigue and attention drops.",
                },
                {
                  num: "03",
                  title: "Prioritize accuracy",
                  desc: "Establish a low error rate before attempting to maximize speed.",
                },
                {
                  num: "04",
                  title: "Test at peak alertness",
                  desc: "Test when fully alert to establish a true baseline.",
                },
                {
                  num: "05",
                  title: "Track baseline trends",
                  desc: "Evaluate progress using multi-week rolling averages rather than individual trials.",
                }
              ].map((tip) => (
                <div
                  key={tip.num}
                  className="bg-white dark:bg-[#12161B] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 font-heading text-[#0066FF] dark:text-[#22C7D6] font-bold text-xs tracking-wider">
                    <span className="font-mono text-slate-400">{tip.num} —</span>
                    <span>{tip.title}</span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 font-sans leading-relaxed pl-5 font-normal">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section className="pt-2 pb-4 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate("assessments")}
              className="w-full h-[52px] bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white rounded-full font-semibold text-sm tracking-wide uppercase flex items-center justify-center gap-2 active:scale-98 transition-all shadow-[0_4px_16px_rgba(0,102,255,0.3)] cursor-pointer"
            >
              <span>Take assessments</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="w-full h-[46px] bg-white dark:bg-[#181D23] hover:bg-slate-50 dark:hover:bg-[#20262E] border border-slate-200/90 dark:border-slate-700 text-[#090D1A] dark:text-[#F5F7FA] rounded-full font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              Return home
            </button>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

