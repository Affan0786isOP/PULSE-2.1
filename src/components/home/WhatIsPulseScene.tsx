import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

const MEASUREMENT_STEPS = [
  {
    number: '01',
    label: 'STIMULUS',
    detail: 'A controlled signal is presented.',
  },
  {
    number: '02',
    label: 'RESPONSE',
    detail: 'The user responds to the signal.',
  },
  {
    number: '03',
    label: 'TIMESTAMP',
    detail: 'The response is captured with precise timing.',
  },
  {
    number: '04',
    label: 'MEASUREMENT',
    detail: 'The response becomes structured data.',
  },
] as const;

export function WhatIsPulseScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section
      id="what-is-pulse"
      aria-labelledby="what-is-pulse-heading"
      className="relative min-h-[100dvh] w-full border-t border-[var(--border-subtle)] px-6 py-20 sm:px-12 sm:py-24 lg:px-16 lg:py-28"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-[1600px] flex-col justify-center">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-20">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[var(--accent)]">
                02 / WHAT IS PULSE?
              </span>
              <span className="h-px w-12 bg-[var(--border-default)]" aria-hidden="true" />
            </div>

            <h2
              id="what-is-pulse-heading"
              className="max-w-3xl font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl"
            >
              PULSE TURNS HUMAN RESPONSE
              <span className="block text-[var(--accent)]">INTO MEASURABLE DATA.</span>
            </h2>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-8">
              PULSE is an open-source, browser-based cognitive benchmarking system.
              Controlled tasks, precise timing, and structured telemetry turn a simple
              response into a measurement you can study.
            </p>

            <div className="mt-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent-subtle)]" aria-hidden="true" />
              From stimulus to measurement
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-8 rounded-[2rem] bg-[var(--accent)] opacity-[0.025] blur-3xl"
              aria-hidden="true"
            />

            <div
              className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-1)]/70 p-5 sm:p-7"
              aria-label="PULSE measurement flow"
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'var(--bg-grid-pattern)',
                  backgroundSize: '72px 72px',
                }}
                aria-hidden="true"
              />

              <div className="relative">
                <div className="mb-7 flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[var(--text-muted)]">
                    MEASUREMENT FLOW
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--accent)]">
                    PULSE / 02
                  </span>
                </div>

                <div className="hidden items-stretch gap-0 lg:flex">
                  {MEASUREMENT_STEPS.map((step, index) => (
                    <React.Fragment key={step.number}>
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--accent)]">{step.number}</span>
                          <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[var(--text-primary)]">
                            {step.label}
                          </span>
                        </div>
                        <p className="max-w-[180px] text-xs leading-6 text-[var(--text-secondary)]">
                          {step.detail}
                        </p>
                      </div>

                      {index < MEASUREMENT_STEPS.length - 1 && (
                        <div className="flex w-12 items-start justify-center pt-1.5" aria-hidden="true">
                          <div className="relative h-px w-full overflow-hidden bg-[var(--border-default)]">
                            {!shouldReduceMotion && (
                              <motion.div
                                className="absolute inset-y-0 left-0 w-8 bg-[var(--accent)]"
                                animate={{ x: ['-120%', '320%'] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', delay: index * 0.35 }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex flex-col lg:hidden">
                  {MEASUREMENT_STEPS.map((step, index) => (
                    <React.Fragment key={step.number}>
                      <div className="flex items-start gap-4">
                        <div className="flex w-10 shrink-0 flex-col items-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-2)] font-mono text-[10px] text-[var(--accent)]">
                            {step.number}
                          </span>
                          {index < MEASUREMENT_STEPS.length - 1 && (
                            <div className="mt-2 h-12 w-px bg-[var(--border-default)]" aria-hidden="true" />
                          )}
                        </div>

                        <div className="pb-7">
                          <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[var(--text-primary)]">
                            {step.label}
                          </span>
                          <p className="mt-2 max-w-md text-xs leading-6 text-[var(--text-secondary)]">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Output
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-primary)]">
                      STRUCTURED TELEMETRY
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full ${bar < 6 ? 'bg-[var(--accent)]/50' : 'bg-[var(--border-default)]'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Next / Assessments
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            02 — 10
          </span>
        </div>
      </div>
    </section>
  );
}
