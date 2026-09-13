import React, { useState, useEffect } from "react";
import { motion } from 'motion/react';
import { Navbar } from "./Navbar";
import { getRandomizedFacts } from "../../../src/data/facts";
import { SEO } from "./SEO";
import {
  Check,
  ChevronRight,
  Play,
  BrainCircuit,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function Improve({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [facts] = useState<string[]>(() => getRandomizedFacts());

  const toggleChecklist = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const protocolItems = [
    "Sleep 8–9 hours consistently",
    "Exercise regularly (aerobic)",
    "Stay hydrated throughout the day",
    "Practice cognitive tasks routinely",
    "Take scheduled screen & eye breaks",
    "Minimize environmental distractions",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % facts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [facts.length]);

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <SEO 
        title="Calibrating & Improving Input Latency | PULSE Mobile"
        description="Learn how hardware factors like screen refresh rate, browser rendering pipelines, and input devices influence measured sensory-motor latencies."
      />
      {/* Navbar Header */}
      <Navbar currentView="improve" onNavigate={onNavigate} onBack={() => onNavigate('home')} title="IMPROVE" />

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
              <span>PERFORMANCE PROTOCOL</span>
            </div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Improve Speed &amp; Focus
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1">
              Evidence-based habits to reduce latency variance.
            </p>
          </div>

          {/* Factors Summary */}
          <section className="flex flex-col gap-2">
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
                  <span>Reduces Performance</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Sleep deprivation", "Acute stress", "Mental fatigue", "Screen fatigue"].map((item) => (
                    <span
                      key={item}
                      className="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 text-[11px] px-2 py-0.5 rounded font-sans"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Supports */}
              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[var(--success)] font-mono text-[10px] font-semibold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  <span>Improves Performance</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Sleep (8-9h)", "Aerobic exercise", "Hydration", "Balanced nutrition", "Task familiarity"].map((item) => (
                    <span
                      key={item}
                      className="bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 text-[11px] px-2 py-0.5 rounded font-sans"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Action Checklist Protocol */}
          <section className="flex flex-col gap-2">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                DAILY HABITS
              </span>
              <h2 className="font-heading text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Daily Optimization Checklist
              </h2>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-secondary)] font-medium">OPTIMIZATION</span>
                <span className="text-[var(--accent)] font-semibold">
                  {checkedItems.size} / 6 COMPLETE
                </span>
              </div>

              <div className="w-full h-1.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${(checkedItems.size / 6) * 100}%` }}
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                {protocolItems.map((item, index) => {
                  const isChecked = checkedItems.has(index);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleChecklist(index)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--text-primary)]"
                          : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="text-xs font-medium tracking-tight flex items-center gap-2">
                        <span>{item}</span>
                      </span>
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
            </div>
          </section>

          {/* Research Insight */}
          <section className="flex flex-col gap-2">
            <div>
              <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase block">
                NEUROSCIENCE FINDING
              </span>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit size={14} />
                  <span>Did You Know?</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {(currentSlide + 1).toString().padStart(2, "0")} / {facts.length.toString().padStart(2, "0")}
                </span>
              </div>

              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans min-h-[40px] flex items-center">
                "{facts[currentSlide]}"
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % facts.length)}
                  className="flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer active:scale-95"
                >
                  <span>NEXT OBSERVATION</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* System Protocol Tips */}
          <section className="flex flex-col gap-2">
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
                  desc: "Test when rested and alert to set true baselines.",
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
