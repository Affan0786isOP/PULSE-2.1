import React, { useState, useEffect, useRef } from "react";
import { motion } from 'motion/react';
import { Navbar } from "./Navbar";
import { getRandomizedFacts } from "../data/facts";
import { SEO } from "./SEO";
import { HookSidebar } from "./ui/hook-sidebar";
import { ScrollProgress } from "./ui/scroll-progress";
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
  ChevronDown,
  BrainCircuit,
  Play,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const improveSections = [
  { id: "factors", label: "Physiological Factors" },
  { id: "checklist", label: "Action Checklist" },
  { id: "ledger", label: "Research Ledger" },
  { id: "expectations", label: "Expectation Management" },
  { id: "recommendations", label: "System Recommendations" },
];

export function Improve({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [facts] = useState<string[]>(() => getRandomizedFacts());
  const [activeIndex, setActiveIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const toggleChecklist = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const checklistItems = [
    {
      title: "Sleep 8–9 hours",
      desc: "Adequate sleep supports sustained attention and consistent cognitive performance.",
    },
    {
      title: "Exercise regularly",
      desc: "Regular aerobic activity supports overall brain health and cognitive function.",
    },
    {
      title: "Stay hydrated",
      desc: "Proper hydration is linked to better focus and sustained attention.",
    },
    {
      title: "Practice reaction-based tasks",
      desc: "Practicing assessments can help you become more familiar with the tasks and improve your scores.",
    },
    {
      title: "Improve hand-eye coordination",
      desc: "Physical activities like juggling can help improve general hand-eye coordination.",
    },
    {
      title: "Limit excessive screen time",
      desc: "Taking breaks from screens can help reduce eye strain and maintain focus.",
    },
    {
      title: "Take regular breaks",
      desc: "Using structured focus intervals prevents mental fatigue and keeps you sharp.",
    },
    {
      title: "Eat balanced meals",
      desc: "A balanced diet supports overall brain health and sustained energy levels.",
    },
    {
      title: "Maintain good posture",
      desc: "Correct ergonomics can prevent discomfort and help you stay focused during tasks.",
    },
    {
      title: "Manage stress",
      desc: "Lowering daily stress helps you focus better and react faster.",
    },
    {
      title: "Practice consistently",
      desc: "Consistent practice helps you become more familiar with tasks and can improve consistency.",
    },
  ];

  const optimizationPercentage = Math.round(
    (checkedItems.size / checklistItems.length) * 100,
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % facts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [facts.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = improveSections.findIndex(s => s.id === entry.target.id);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { root: scrollContainerRef.current, rootMargin: "-20% 0px -50% 0px", threshold: 0.1 }
    );

    improveSections.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <SEO 
        title="Calibrating & Improving Input Latency | PULSE"
        description="Learn how hardware factors like screen refresh rate, browser rendering pipelines, and input devices influence measured sensory-motor latencies."
      />
      <Navbar currentView="improve" onNavigate={onNavigate} onBack={() => onNavigate('home')} />

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
        />

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 xl:gap-16">
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 self-start z-10 px-4 sm:px-6 lg:px-0 order-1 lg:order-1 flex justify-center lg:justify-start">
            <div className="w-full max-w-full sm:max-w-sm lg:max-w-none bg-[var(--surface-1)]/60 backdrop-blur-sm lg:bg-transparent p-3 sm:p-4 lg:p-0 rounded-xl border border-[var(--border-subtle)] lg:border-none shadow-sm lg:shadow-none mb-4 lg:mb-0">
              <HookSidebar
                items={improveSections}
                value={activeIndex}
                onChange={(idx) => {
                  const id = improveSections[idx].id;
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
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
                <Sparkles size={13} />
                <span>PERFORMANCE OPTIMIZATION</span>
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
                Improving Reaction Speed &amp; Accuracy
              </h1>
              <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl leading-relaxed">
                Research-backed protocols, physiological variables, and actionable habits to maintain optimal cognitive latency and decision speed.
              </p>
            </div>

            {/* Section: Physiological Factors */}
            <section id="factors" className="scroll-mt-8">
            <div className="mb-6 text-center md:text-left">
              <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                VARIABLE MATRIX
              </span>
              <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                What Affects Your Reaction Time?
              </h2>
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm max-w-2xl">
                Your latency is dynamic and responds directly to biological state, environmental cues, and fatigue levels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {[
                {
                  icon: Moon,
                  title: "Sleep Deprivation",
                  desc: "Inadequate rest impairs cognitive processing and increases reaction latency.",
                  reduces: true,
                },
                {
                  icon: Droplet,
                  title: "Hydration Level",
                  desc: "Mild dehydration negatively affects sustained attention and working memory.",
                  reduces: false,
                },
                {
                  icon: Activity,
                  title: "Acute Stress",
                  desc: "Elevated cortisol interferes with rapid decision-making and motor output.",
                  reduces: true,
                },
                {
                  icon: User,
                  title: "Biological Age",
                  desc: "Processing speed typically peaks in early adulthood with gradual variance over time.",
                  reduces: true,
                },
                {
                  icon: Target,
                  title: "Targeted Practice",
                  desc: "Familiarity with visual cues reduces cognitive load and response uncertainty.",
                  reduces: false,
                },
                {
                  icon: Dumbbell,
                  title: "Physical Exercise",
                  desc: "Aerobic activity increases cerebral blood flow and supports neural plasticity.",
                  reduces: false,
                },
                {
                  icon: Apple,
                  title: "Balanced Nutrition",
                  desc: "Stable blood glucose prevents cognitive dips and attention drift.",
                  reduces: false,
                },
                {
                  icon: Brain,
                  title: "Mental Fatigue",
                  desc: "Extended cognitive strain increases error rates and lengthens decision time.",
                  reduces: true,
                },
                {
                  icon: Monitor,
                  title: "Screen Fatigue",
                  desc: "Continuous optical strain without visual breaks impairs visual search speed.",
                  reduces: true,
                },
                {
                  icon: Coffee,
                  title: "Caffeine Intake",
                  desc: "Moderate caffeine temporary increases alertness and visual processing speed.",
                  reduces: false,
                },
              ].map((factor, i) => (
                <div
                  key={`factor-${factor.title}-${i}`}
                  className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4.5 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3">
                      <factor.icon size={16} />
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
                      factor.reduces
                        ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                        : "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${factor.reduces ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'}`} />
                    {factor.reduces ? "Reduces performance" : "Improves performance"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Action Checklist */}
          <section id="checklist" className="scroll-mt-8">
            <div className="mb-6 text-center md:text-left">
              <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                HABIT OPTIMIZATION
              </span>
              <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                Action Checklist
              </h2>
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm max-w-2xl">
                Track and implement these core lifestyle habits to build consistent baseline readiness.
              </p>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-xs sm:text-sm text-[var(--text-primary)]">
                    Optimization Readiness
                  </span>
                  <span className="text-[var(--accent)] font-mono text-xs font-semibold">
                    {optimizationPercentage}% COMPLETE
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div
                    className="w-full h-full bg-[var(--accent)] origin-left transition-transform duration-300 ease-out rounded-full"
                    style={{ transform: `scaleX(${optimizationPercentage / 100})` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {checklistItems.map((item, index) => {
                  const isChecked = checkedItems.has(index);
                  return (
                    <button
                      type="button"
                      key={`chk-${item.title}-${index}`}
                      onClick={() => toggleChecklist(index)}
                      className={`flex text-left gap-3.5 p-3.5 rounded-lg border cursor-pointer transition-[background-color,border-color,transform] active:scale-[0.99] ${
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
                        <h4
                          className="font-semibold text-xs sm:text-sm mb-0.5 text-[var(--text-primary)]"
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section: Research Ledger */}
          <section id="ledger" className="scroll-mt-8">
            <div className="mb-4 text-center md:text-left">
              <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                NEUROSCIENCE RESEARCH
              </span>
              <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Synaptic Insights &amp; Findings
              </h2>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[var(--accent)]" />
                  <span className="font-heading text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                    Research Observation
                  </span>
                </div>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {(currentSlide + 1).toString().padStart(2, "0")} / {facts.length.toString().padStart(2, "0")}
                </span>
              </div>

              <p className="font-sans text-base sm:text-lg font-normal leading-relaxed text-[var(--text-primary)] mb-6 min-h-[70px] flex items-center">
                "{facts[currentSlide]}"
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline-block">
                  Calibrated research summary
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide(
                        (prev) => (prev - 1 + facts.length) % facts.length,
                      )
                    }
                    className="w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Previous observation"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide((prev) => (prev + 1) % facts.length)
                    }
                    className="w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Next observation"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Can Everyone Improve? */}
          <section id="expectations" className="scroll-mt-8">
            <div className="mb-4 text-center md:text-left">
              <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                EXPECTATION MANAGEMENT
              </span>
              <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Can Everyone Improve Their Results?
              </h2>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed shadow-sm">
              <p>
                While absolute physiological limits set a floor on neural transmission speed, day-to-day variance is heavily driven by focus drift, fatigue, and environmental distractions.
              </p>
              <p>
                By practicing consistent sleep hygiene, minimizing input latency in your setup, and engaging in structured assessment tasks, you can minimize preventable performance dips and achieve higher consistency.
              </p>
            </div>
          </section>

          {/* Section: System Recommendations */}
          <section id="recommendations" className="scroll-mt-8">
            <div className="mb-6 text-center md:text-left">
              <span className="font-mono text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase block mb-1">
                PULSE PROTOCOL
              </span>
              <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                System Recommendations
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                {
                  num: "01",
                  title: "Train Consistently",
                  desc: "Short daily sessions of 5–10 minutes yield better task familiarity than sporadic long sessions.",
                },
                {
                  num: "02",
                  title: "Incorporate Rest",
                  desc: "Avoid back-to-back testing without rest to prevent eye fatigue and attention degradation.",
                },
                {
                  num: "03",
                  title: "Prioritize Accuracy",
                  desc: "Establish low error rates first before attempting to maximize raw execution speed.",
                },
                {
                  num: "04",
                  title: "Peak Alertness",
                  desc: "Test when fully alert to establish true biological baselines rather than fatigued state.",
                },
                {
                  num: "05",
                  title: "Track Baseline Trends",
                  desc: "Evaluate progress across multi-week rolling averages rather than individual trial spikes.",
                },
              ].map((tip, i) => (
                <div
                  key={`tip-${tip.num}-${tip.title}-${i}`}
                  className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div className="font-mono text-xs font-semibold text-[var(--accent)] mb-2">
                    RECOMMENDATION {tip.num}
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
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-medium text-xs tracking-wider uppercase px-6 py-3 rounded-md transition-colors font-bold cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Take assessments</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] font-medium text-xs tracking-wider uppercase px-6 py-3 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Return home</span>
              </button>
            </div>
          </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
