import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Database, ArrowRight, Monitor, Trophy, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { Navbar } from './Navbar';
import { useAuth } from '../AuthContext';
import { useRefreshRate } from '../lib/useRefreshRate';
import { SEO } from './SEO';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PULSE — Precision User Latency & Stimulus Evaluator",
  "url": "https://pulse-lab.in/",
  "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
};

const ROUTES = {
  ASSESSMENTS: '/assessments',
  LEADERBOARD: '/leaderboard',
  DATASET: '/dataset',
  IMPROVE: '/improve',
  PRIVACY: '/privacy',
} as const;

interface HomeNavCard {
  to: string;
  label: string;
  description: string;
  ariaLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const HOME_NAV_CARDS: readonly HomeNavCard[] = [
  {
    to: ROUTES.LEADERBOARD,
    label: 'Leaderboard',
    description: 'Verified cohort rankings',
    ariaLabel: 'View Leaderboard — Verified cohort rankings',
    icon: Trophy,
  },
  {
    to: ROUTES.DATASET,
    label: 'Research Dataset',
    description: 'Population telemetry & observations',
    ariaLabel: 'View Open Research Dataset — Population telemetry and observations',
    icon: Database,
  },
  {
    to: ROUTES.IMPROVE,
    label: 'Improve',
    description: 'Factors that can affect reaction performance',
    ariaLabel: 'View Improve — Factors that can affect reaction performance',
    icon: Zap,
  },
  {
    to: ROUTES.PRIVACY,
    label: 'Privacy Policy',
    description: 'Research data ethics & anonymization',
    ariaLabel: 'View Privacy Policy — Research data ethics and anonymization',
    icon: ShieldCheck,
  },
];

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0
    }
  }
};

const fadeItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" }
  }
};

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isConnecting, authError, retryAuth } = useAuth();
  const refreshInfo = useRefreshRate();

  React.useEffect(() => {
    if (authError) {
      console.warn('[PULSE Auth Notice]:', authError);
    }
  }, [authError]);

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans selection:bg-cyan-500/30 overflow-x-hidden relative flex flex-col justify-between">
      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
        schema={HOME_SCHEMA}
      />
      {/* Top Navbar Header */}
      <Navbar currentView="home" onNavigate={onNavigate} />

      {/* Main Hero Section */}
      <main className="w-full max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-10 z-10 flex-1 flex flex-col justify-center py-8 lg:py-16">
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] items-center gap-10 lg:gap-14 my-auto">
          
          {/* Left Column: Tag, Headline, Description, Button */}
          <motion.div 
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="w-full flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Top Tag & Scientific Telemetry Badge */}
            <motion.div variants={fadeItemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-5">
              <div className="inline-flex items-center gap-2 px-3 h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-medium">
                <span>Cognitive reaction &amp; memory assessments</span>
              </div>

              {/* Technical Telemetry Badge: Live cadence readout with stable footprint */}
              <div 
                className="inline-flex items-center gap-2 px-3 h-7 max-w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-mono shrink-0 select-none overflow-hidden"
                aria-label={
                  refreshInfo.status === 'detecting'
                    ? "Estimating display frame cadence"
                    : refreshInfo.status === 'error'
                    ? "Frame cadence estimation error, using 60 Hz baseline model"
                    : refreshInfo.source === 'measured'
                    ? `${refreshInfo.hz} Hz browser frame cadence estimate with ${refreshInfo.displayDelayOffsetMs} ms theoretical model offset`
                    : refreshInfo.source === 'estimated'
                    ? `Approximately ${refreshInfo.hz} Hz calculated cadence with ${refreshInfo.displayDelayOffsetMs} ms theoretical model offset`
                    : '60 Hz baseline assumption with 8.33 ms theoretical model offset'
                }
                title={
                  refreshInfo.status === 'detecting'
                    ? 'Estimating browser frame cadence and midpoint model offset…'
                    : refreshInfo.status === 'error'
                    ? 'Cadence detection error — using 60 Hz baseline model (~8.33 ms offset)'
                    : `Browser frame cadence estimate (~${refreshInfo.hz} Hz, model offset: ~${refreshInfo.displayDelayOffsetMs} ms). Theoretical rasterization midpoint estimate, not a hardware sensor or photodiode measurement.`
                }
              >
                <span className="flex items-center gap-1.5 shrink-0">
                  <Monitor 
                    size={12} 
                    aria-hidden="true"
                    className={
                      refreshInfo.status === 'detecting' 
                        ? "text-[var(--accent)] animate-pulse motion-reduce:animate-none" 
                        : refreshInfo.status === 'error'
                        ? "text-rose-400"
                        : refreshInfo.source === 'measured' 
                        ? "text-[var(--accent)]" 
                        : refreshInfo.source === 'estimated' 
                        ? "text-amber-400" 
                        : "text-[var(--text-secondary)]"
                    } 
                  />
                  <span 
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      refreshInfo.status === 'detecting'
                        ? 'bg-[var(--accent)] animate-ping motion-reduce:animate-none'
                        : refreshInfo.status === 'error'
                        ? 'bg-rose-400'
                        : refreshInfo.source === 'measured'
                        ? 'bg-[var(--accent)]'
                        : refreshInfo.source === 'estimated'
                        ? 'bg-amber-400'
                        : 'bg-[var(--text-muted)]'
                    }`} 
                  />
                </span>
                <span className="truncate">
                  {refreshInfo.status === 'detecting'
                    ? 'Estimating frame cadence…'
                    : refreshInfo.status === 'error'
                    ? '60 Hz · fallback model'
                    : refreshInfo.source === 'measured'
                    ? `${refreshInfo.hz} Hz · ~${refreshInfo.displayDelayOffsetMs} ms model offset`
                    : refreshInfo.source === 'estimated'
                    ? `~${refreshInfo.hz} Hz · ~${refreshInfo.displayDelayOffsetMs} ms model offset`
                    : '60 Hz · ~8.33 ms model offset'
                  }
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 variants={fadeItemVariants} className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.12] mb-5 text-[var(--text-primary)]">
              Measure your reaction time and cognitive performance.
            </motion.h1>

            {/* Description Paragraph - Aligned with actual protocols */}
            <motion.p variants={fadeItemVariants} className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl font-normal leading-relaxed text-center lg:text-left mb-8">
              PULSE evaluates visual reaction latency, directional choice speed, and working memory through research-informed assessment protocols.
            </motion.p>

            {/* Primary Action Button - Standard robust link supporting modifier clicks */}
            <motion.div variants={fadeItemVariants} className="flex items-center gap-3">
              <Link 
                to={ROUTES.ASSESSMENTS}
                id="start-lab-btn"
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-white dark:text-slate-950 font-semibold text-sm px-6 py-3.5 rounded-md inline-flex items-center justify-center gap-2.5 cursor-pointer transition-[background-color,transform,box-shadow] duration-150 motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
              >
                <span>Start assessments</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column: Navigation Cards - Native accessible links */}
          <motion.div 
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[360px] flex flex-col gap-2.5 shrink-0 mx-auto lg:mx-0"
          >
            {HOME_NAV_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.to} variants={fadeItemVariants}>
                  <Link
                    to={card.to}
                    aria-label={card.ariaLabel}
                    className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-3.5 sm:p-4 flex items-center justify-between transition-[background-color,border-color] duration-150 motion-reduce:transition-none group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--accent)]/30 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent)] shrink-0 transition-colors duration-150 motion-reduce:transition-none">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--text-primary)] leading-snug">
                          {card.label}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {card.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={15} aria-hidden="true" className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-[color,transform] duration-150 motion-reduce:transition-none motion-reduce:transform-none shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer 
        className="w-full border-t border-[var(--border-subtle)] py-4 px-4 sm:px-6 lg:px-10 text-center text-xs text-[var(--text-secondary)] font-mono z-10 flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
      >
        <div className="flex items-center gap-2">
          <span>PULSE v2.1</span>
          <span aria-hidden="true">•</span>
          <span>Open Cognitive Benchmark</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to={ROUTES.PRIVACY}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Privacy
          </Link>
          <Link 
            to={ROUTES.DATASET}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Dataset
          </Link>
        </div>
      </footer>

      {/* Non-intrusive Offline Notice: Accurately informs about local offline capability without alarmism */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))' }}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl p-3 rounded-lg bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-default)] shadow-xl text-[var(--text-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={15} aria-hidden="true" className="shrink-0 text-amber-500 dark:text-amber-400" />
              <div className="text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Notice: </span>
                <span>Cloud session tracking is unavailable. Assessments continue locally in offline mode.</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => retryAuth()}
              disabled={isConnecting}
              aria-label="Retry connection"
              className="px-2.5 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-primary)] text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <RefreshCw size={11} aria-hidden="true" className={isConnecting ? "animate-spin motion-reduce:animate-none" : ""} />
              <span>{isConnecting ? "Retrying..." : "Retry"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
