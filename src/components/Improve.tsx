import React, { useState, useEffect, useRef } from "react";
import { motion } from 'motion/react';
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
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
import { HookSidebar } from "./ui/hook-sidebar";
import { ScrollProgress } from "./ui/scroll-progress";
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

const improveSections = [
  { id: "factors", label: "Physiological factors" },
  { id: "checklist", label: "Preparation checklist" },
  { id: "ledger", label: "Research findings" },
  { id: "expectations", label: "Expectations" },
  { id: "recommendations", label: "Best practices" },
];

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLedgerPaused, setIsLedgerPaused] = useState(false);
  const [ledgerTimerReset, setLedgerTimerReset] = useState(0);
  const scrollContainerRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = improveSections.findIndex((s) => s.id === entry.target.id);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { root: scrollContainerRef.current, rootMargin: "-15% 0px -45% 0px", threshold: 0.1 }
    );

    improveSections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const selectImproveSection = (index: number) => {
    if (index < 0 || index >= improveSections.length) return;
    setActiveIndex(index);
    const id = improveSections[index]?.id;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({
        behavior: isReducedMotionActive() ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  const activeEntry = researchEntries[currentSlide] || researchEntries[0];
  const activeEvidence = getEvidenceBadge(activeEntry.evidenceType);

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <SEO 
        title="Performance Guide | PULSE"
        description="Review research, physiological factors, and preparation habits that affect response time and measurement consistency."
      />
      <Navbar currentView="improve" onNavigate={onNavigate} />

      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-transparent relative pt-8 pb-32 pb-safe px-safe"
        style={{
          paddingBottom: 'max(8rem, calc(4rem + env(safe-area-inset-bottom, 0px)))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <ScrollProgress 
          sections={improveSections}
          containerRef={scrollContainerRef}
          offset={100}
          activeId={improveSections[activeIndex]?.id}
          onSelectSection={(_, idx) => selectImproveSection(idx)}
          className="lg:hidden"
        />

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 xl:gap-16">
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 self-start z-10 px-4 sm:px-6 lg:px-0 order-1 lg:order-1 flex justify-center lg:justify-start">
            <div className="w-full max-w-full sm:max-w-sm lg:max-w-none bg-[var(--surface-1)]/60 backdrop-blur-sm lg:bg-transparent p-3 sm:p-4 lg:p-0 rounded-xl border border-[var(--border-subtle)] lg:border-none mb-4 lg:mb-0">
              <HookSidebar
                items={improveSections}
                value={activeIndex}
                onChange={selectImproveSection}
                color="var(--accent)"
                label="Sections"
                className="w-full [&_[data-slot=hook-sidebar-label]]:pb-1.5 [&_[data-slot=hook-sidebar-label]]:text-xs lg:[&_[data-slot=hook-sidebar-label]]:pb-3 lg:[&_[data-slot=hook-sidebar-label]]:text-sm [&_[data-slot=hook-sidebar-item]]:py-1 [&_[data-slot=hook-sidebar-item]]:text-xs sm:[&_[data-slot=hook-sidebar-item]]:text-sm lg:[&_[data-slot=hook-sidebar-item]]:py-1.5"
              />
            </div>
          </aside>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 min-w-0 px-6 lg:px-0 relative z-10 flex flex-col gap-12 order-2"
          >
            {/* Header Section */}
            <div className="text-center md:text-left border-b border-[var(--border-subtle)] pb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--accent)] text-xs font-mono mb-3">
                <BookOpen size={13} />
                <span>Performance guide</span>
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
                Performance &amp; Consistency
              </h1>
              <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl leading-relaxed">
                Review the physiological factors and habits that affect response latency and measurement consistency.
              </p>
            </div>

            {/* Section 1: Physiological Factors */}
            <section id="factors" className="scroll-mt-8">
              <div className="mb-6 text-center md:text-left">
                <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                  Biological &amp; environmental factors
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  What affects measured reaction time?
                </h2>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm max-w-2xl">
                  Response time changes based on biological states, environmental cues, hardware, and fatigue.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {PHYSIOLOGICAL_FACTORS.map((factor) => {
                  const IconComp = FACTOR_ICONS[factor.iconName] || Brain;
                  const evidence = getEvidenceBadge(factor.evidenceType);
                  const isHigherLatency = factor.impact === 'associated_increase' || (factor.impact === undefined && factor.reduces);
                  return (
                    <div
                      key={`factor-${factor.id}`}
                      className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4.5 flex flex-col justify-between transition-colors hover:border-[var(--border-default)]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                            <IconComp size={16} />
                          </div>
                          <span
                            className={`font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${evidence.className}`}
                          >
                            {evidence.label}
                          </span>
                        </div>
                        <h3 className="font-heading text-[var(--text-primary)] font-semibold text-sm mb-1">
                          {factor.title}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-3">
                          {factor.desc}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border w-fit ${
                          isHigherLatency
                            ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                            : "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isHigherLatency ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'}`} />
                        {isHigherLatency ? "Associated with higher latency" : "Supports response consistency"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Action Checklist */}
            <section id="checklist" className="scroll-mt-8">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                    Daily habits
                  </span>
                  <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                    Preparation checklist
                  </h2>
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm max-w-2xl">
                    Check off the habits you follow to maintain testing consistency.
                  </p>
                </div>
                {checkedItems.size > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChecklist}
                    className="self-center sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:scale-95 active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-[transform,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset checklist</span>
                  </button>
                )}
              </div>

              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-xs sm:text-sm text-[var(--text-primary)]">
                      Preparation progress
                    </span>
                    <span className="text-[var(--accent)] font-mono text-xs font-semibold">
                      {checkedItems.size} of {PREPARATION_HABITS.length} habits checked ({habitCompletionPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div
                      className="w-full h-full bg-[var(--accent)] origin-left transition-transform duration-300 ease-out rounded-full"
                      style={{ transform: `scaleX(${habitCompletionPercentage / 100})` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PREPARATION_HABITS.map((item, index) => {
                    const isChecked = checkedItems.has(index);
                    return (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-label={`${item.title}: ${item.desc}`}
                        key={`chk-${item.id}-${index}`}
                        onClick={() => toggleChecklist(index)}
                        className={`flex text-left gap-3.5 p-3.5 rounded-lg border cursor-pointer transition-[background-color,border-color,transform] active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          isChecked
                            ? "bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--text-primary)]"
                            : "bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--border-default)] active:bg-[var(--surface-3)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? "bg-[var(--accent)] text-slate-950 font-bold"
                              : "bg-[var(--surface-1)] border border-[var(--border-strong)] text-transparent"
                          }`}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                              {item.title}
                            </h4>
                            <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase px-1 py-0.2 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)]">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                  <ShieldCheck size={14} className="text-[var(--accent)] shrink-0" />
                  <span>
                    These habits support testing consistency and minimize fatigue. They do not directly measure cognitive ability.
                  </span>
                </div>
              </div>
            </section>

            {/* Section 3: Research Ledger */}
            <section id="ledger" className="scroll-mt-8">
              <div className="mb-4 text-center md:text-left">
                <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                  Research ledger
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
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
                className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <span className="font-heading text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase block">
                        {activeEntry.domain}
                      </span>
                      <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${activeEvidence.className}`}>
                        {activeEvidence.label}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {(currentSlide + 1).toString().padStart(2, "0")} / {researchEntries.length.toString().padStart(2, "0")}
                  </span>
                </div>

                <p className="font-sans text-base sm:text-lg font-normal leading-relaxed text-[var(--text-primary)] mb-6 min-h-[60px] flex items-center">
                  "{activeEntry.statement}"
                </p>

                {/* Provenance Box */}
                <div className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-[var(--accent)] shrink-0" />
                    <div>
                      <span className="text-[var(--text-primary)] font-medium">
                        {activeEntry.citation.source}
                      </span>
                      <span className="text-[var(--text-muted)] font-mono ml-1.5">
                        ({activeEntry.citation.year}) — {activeEntry.citation.reference}
                      </span>
                    </div>
                  </div>
                  {activeEntry.citation.doi && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-1)] px-2 py-0.5 rounded border border-[var(--border-subtle)] inline-flex items-center gap-1 w-fit">
                      <span>DOI: {activeEntry.citation.doi}</span>
                      <ExternalLink size={10} />
                    </span>
                  )}
                </div>

                {/* Carousel Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline-block">
                    Citation
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:scale-95 text-[var(--text-primary)] transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer flex items-center justify-center"
                      aria-label="Previous observation"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:scale-95 text-[var(--text-primary)] transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer flex items-center justify-center"
                      aria-label="Next observation"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Expectation Management */}
            <section id="expectations" className="scroll-mt-8">
              <div className="mb-4 text-center md:text-left">
                <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                  Expectation management
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Can you improve your results?
                </h2>
              </div>
              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 space-y-3.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                <p>
                  Absolute physiological limits set a floor on neural transmission speed, but day-to-day variance depends heavily on focus, sleep, and environmental distractions.
                </p>
                <p>
                  You can minimize performance dips and achieve higher consistency by maintaining good sleep habits, minimizing hardware input latency, and practicing the tasks.
                </p>
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Longitudinal gains on benchmark tasks largely reflect task familiarity, stimulus anticipation, and motor pattern learning rather than an expansion of overall cognitive capacity.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Variations across age cohorts reflect sensory-motor processing differences across populations rather than an absolute indicator of individual biological decline.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: System Recommendations */}
            <section id="recommendations" className="scroll-mt-8">
              <div className="mb-6 text-center md:text-left">
                <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                  Best practices
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  How to improve
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    num: "01",
                    title: "Train consistently",
                    desc: "Short daily sessions of 5–10 minutes build better task familiarity than sporadic long sessions.",
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
                  },
                ].map((tip) => (
                  <div
                    key={`tip-${tip.num}-${tip.title}`}
                    className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col justify-between hover:border-[var(--border-default)] transition-colors"
                  >
                    <div className="font-mono text-xs font-semibold text-[var(--accent)] mb-2">
                      Tip {tip.num}
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)] mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {tip.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Actions */}
            <section className="pt-4 text-center border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("assessments")}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-medium text-xs tracking-wider uppercase px-6 py-3 rounded-md transition-[transform,background-color] font-bold cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span>Take assessments</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("home")}
                  className="border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] font-medium text-xs tracking-wider uppercase px-6 py-3 rounded-md transition-[transform,background-color,border-color] cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span>Return home</span>
                </button>
              </div>
            </section>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

