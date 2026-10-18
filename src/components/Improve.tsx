import React, { useState, useEffect, useRef } from "react";
import { motion } from 'motion/react';
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
import { HookSidebar } from "./ui/hook-sidebar";
import { ScrollProgress } from "./ui/scroll-progress";
import { isReducedMotionActive, playAudioCue } from "../lib/settingsStore";
import { PageShell } from "./layout/PageShell";
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
        className: "bg-[#E0F2FE] text-[#0066FF] border-[#BFDBFE]",
      };
    case "association":
      return {
        label: "Statistical Association",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "interpretation":
      return {
        label: "Theoretical Model",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "practical_protocol":
      return {
        label: "Practical Protocol",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    default:
      return {
        label: "Scientific Finding",
        className: "bg-slate-100 text-slate-700 border-slate-200",
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (typeof IntersectionObserver === 'undefined') return;
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
    <PageShell
      currentView="improve"
      onNavigate={onNavigate}
      decorativeWaves="none"
      maxWidth="full"
      contentClassName="pt-8 pb-24"
    >
      <div ref={scrollContainerRef} className="w-full">
        <ScrollProgress 
          sections={improveSections}
          containerRef={scrollContainerRef}
          offset={100}
          activeId={improveSections[activeIndex]?.id}
          onSelectSection={(_, idx) => selectImproveSection(idx)}
          className="lg:hidden"
        />

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 xl:gap-16 px-4 sm:px-6 lg:px-8">
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 self-start z-10 px-0 order-1 lg:order-1 flex justify-center lg:justify-start">
            <div className="w-full max-w-full sm:max-w-sm lg:max-w-none bg-white/80 backdrop-blur-sm lg:bg-transparent p-3 sm:p-4 lg:p-0 rounded-xl border border-slate-200/80 lg:border-none mb-4 lg:mb-0 shadow-xs lg:shadow-none">
              <HookSidebar
                items={improveSections}
                value={activeIndex}
                onChange={selectImproveSection}
                color="#0066FF"
                label="Sections"
                className="w-full [&_[data-slot=hook-sidebar-label]]:pb-1.5 [&_[data-slot=hook-sidebar-label]]:text-xs lg:[&_[data-slot=hook-sidebar-label]]:pb-3 lg:[&_[data-slot=hook-sidebar-label]]:text-sm [&_[data-slot=hook-sidebar-item]]:py-1 [&_[data-slot=hook-sidebar-item]]:text-xs sm:[&_[data-slot=hook-sidebar-item]]:text-sm lg:[&_[data-slot=hook-sidebar-item]]:py-1.5"
              />
            </div>
          </aside>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 min-w-0 relative z-10 flex flex-col gap-12 order-2"
          >
            {/* Header Section */}
            <div className="text-center md:text-left border-b border-slate-200/80 pb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[#BFDBFE] bg-[#E0F2FE] text-[#0066FF] text-xs font-mono mb-3 font-semibold">
                <BookOpen size={13} />
                <span>Performance guide</span>
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[#090D1A] mb-3">
                Performance &amp; Consistency
              </h1>
              <p className="text-[#334155] text-sm sm:text-base max-w-2xl leading-relaxed">
                Review the physiological factors and habits that affect response latency and measurement consistency.
              </p>
            </div>

            {/* Section 1: Physiological Factors */}
            <section id="factors" className="scroll-mt-8">
              <div className="mb-6 text-center md:text-left">
                <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase block mb-1">
                  Biological &amp; environmental factors
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[#090D1A] mb-2">
                  What affects measured reaction time?
                </h2>
                <p className="text-[#334155] text-xs sm:text-sm max-w-2xl">
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
                      className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl p-4.5 flex flex-col justify-between transition-all hover:border-[#0066FF]/40 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-8 h-8 rounded-md bg-[#F0F7FF] border border-[#BFDBFE] flex items-center justify-center text-[#0066FF]">
                            <IconComp size={16} />
                          </div>
                          <span
                            className={`font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${evidence.className}`}
                          >
                            {evidence.label}
                          </span>
                        </div>
                        <h3 className="font-heading text-[#090D1A] font-semibold text-sm mb-1">
                          {factor.title}
                        </h3>
                        <p className="text-[#334155] text-xs leading-relaxed mb-3">
                          {factor.desc}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border w-fit ${
                          isHigherLatency
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isHigherLatency ? 'bg-red-500' : 'bg-emerald-500'}`} />
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
                  <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase block mb-1">
                    Daily habits
                  </span>
                  <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[#090D1A] mb-1">
                    Preparation checklist
                  </h2>
                  <p className="text-[#334155] text-xs sm:text-sm max-w-2xl">
                    Check off the habits you follow to maintain testing consistency.
                  </p>
                </div>
                {checkedItems.size > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChecklist}
                    className="self-center sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-700 hover:text-[#090D1A] text-xs font-mono transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset checklist</span>
                  </button>
                )}
              </div>

              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-xs sm:text-sm text-[#090D1A]">
                      Preparation progress
                    </span>
                    <span className="text-[#0066FF] font-mono text-xs font-semibold">
                      {checkedItems.size} of {PREPARATION_HABITS.length} habits checked ({habitCompletionPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                    <div
                      className="w-full h-full bg-[#0066FF] origin-left transition-transform duration-300 ease-out rounded-full"
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
                        className={`flex text-left gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                          isChecked
                            ? "bg-[#F0F7FF] border-[#0066FF]/40 text-[#090D1A]"
                            : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300 active:bg-slate-100 text-[#334155]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? "bg-[#0066FF] text-white font-bold"
                              : "bg-white border border-slate-300 text-transparent"
                          }`}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-xs sm:text-sm text-[#090D1A]">
                              {item.title}
                            </h4>
                            <span className="font-mono text-[9px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#334155] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <ShieldCheck size={14} className="text-[#0066FF] shrink-0" />
                  <span>
                    These habits support testing consistency and minimize fatigue. They do not directly measure cognitive ability.
                  </span>
                </div>
              </div>
            </section>

            {/* Section 3: Research Ledger */}
            <section id="ledger" className="scroll-mt-8">
              <div className="mb-4 text-center md:text-left">
                <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase block mb-1">
                  Research ledger
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[#090D1A]">
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
                className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xs"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#F0F7FF] border border-[#BFDBFE] flex items-center justify-center text-[#0066FF]">
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <span className="font-heading text-xs font-semibold text-[#090D1A] tracking-wide uppercase block">
                        {activeEntry.domain}
                      </span>
                      <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${activeEvidence.className}`}>
                        {activeEvidence.label}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {(currentSlide + 1).toString().padStart(2, "0")} / {researchEntries.length.toString().padStart(2, "0")}
                  </span>
                </div>

                <p className="font-sans text-base sm:text-lg font-normal leading-relaxed text-[#090D1A] mb-6 min-h-[60px] flex items-center">
                  "{activeEntry.statement}"
                </p>

                {/* Provenance Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-[#0066FF] shrink-0" />
                    <div>
                      <span className="text-[#090D1A] font-medium">
                        {activeEntry.citation.source}
                      </span>
                      <span className="text-slate-500 font-mono ml-1.5">
                        ({activeEntry.citation.year}) — {activeEntry.citation.reference}
                      </span>
                    </div>
                  </div>
                  {activeEntry.citation.doi && (
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 w-fit">
                      <span>DOI: {activeEntry.citation.doi}</span>
                      <ExternalLink size={10} />
                    </span>
                  )}
                </div>

                {/* Carousel Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">
                    Citation
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-[#090D1A] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] cursor-pointer flex items-center justify-center"
                      aria-label="Previous observation"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-[#090D1A] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] cursor-pointer flex items-center justify-center"
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
                <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase block mb-1">
                  Expectation management
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[#090D1A]">
                  Can you improve your results?
                </h2>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-3.5 text-xs sm:text-sm text-[#334155] leading-relaxed shadow-xs">
                <p>
                  Absolute physiological limits set a floor on neural transmission speed, but day-to-day variance depends heavily on focus, sleep, and environmental distractions.
                </p>
                <p>
                  You can minimize performance dips and achieve higher consistency by maintaining good sleep habits, minimizing hardware input latency, and practicing the tasks.
                </p>
                <div className="pt-3 border-t border-slate-200/80 space-y-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Longitudinal gains on benchmark tasks largely reflect task familiarity, stimulus anticipation, and motor pattern learning rather than an expansion of overall cognitive capacity.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Variations across age cohorts reflect sensory-motor processing differences across populations rather than an absolute indicator of individual biological decline.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: System Recommendations */}
            <section id="recommendations" className="scroll-mt-8">
              <div className="mb-6 text-center md:text-left">
                <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase block mb-1">
                  Best practices
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[#090D1A] mb-2">
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
                    className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between hover:border-[#0066FF]/40 transition-colors shadow-xs"
                  >
                    <div className="font-mono text-xs font-semibold text-[#0066FF] mb-2">
                      Tip {tip.num}
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-[#090D1A] mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      {tip.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Actions */}
            <section className="pt-4 text-center border-t border-slate-200/80">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("assessments")}
                  className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs tracking-wider uppercase px-6 py-3 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                >
                  <span>Take assessments</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("home")}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-[#090D1A] font-semibold text-xs tracking-wider uppercase px-6 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                >
                  <span>Return home</span>
                </button>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}

export default Improve;
