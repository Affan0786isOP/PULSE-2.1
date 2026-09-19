import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [isNavigating, setIsNavigating] = React.useState(false);

  React.useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

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
      <main className="w-full max-w-[1140px] mx-auto px-6 sm:px-10 z-10 flex-1 flex flex-col justify-center py-8 lg:py-16">
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] items-center gap-10 lg:gap-14 my-auto">
          
          {/* Left Column: Tag, Headline, Description, Button */}
          <motion.div 
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="w-full flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Top Tag Badge */}
            <motion.div variants={fadeItemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-medium">
                <span>Cognitive reaction &amp; memory assessments</span>
              </div>

              {/* Dimension-reserved refresh rate badge: prevents layout shift and maintains phone-friendly compact footprint */}
              <div 
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 h-[26px] w-[256px] max-w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono shrink-0 select-none overflow-hidden"
                aria-label={
                  refreshInfo.status === 'detecting'
                    ? "Detecting display refresh rate"
                    : `${refreshInfo.hz} Hz display refresh rate, ~${refreshInfo.displayDelayOffsetMs} ms estimated midpoint model`
                }
                title={
                  refreshInfo.status === 'detecting'
                    ? 'Estimating display refresh rate and frame midpoint model…'
                    : refreshInfo.source === 'measured'
                    ? `${refreshInfo.hz} Hz calibrated display · ~${refreshInfo.displayDelayOffsetMs} ms estimated midpoint model (derived from refresh interval; not a direct hardware measurement)`
                    : refreshInfo.source === 'estimated'
                    ? `~${refreshInfo.hz} Hz calculated cadence · ~${refreshInfo.displayDelayOffsetMs} ms estimated midpoint model (derived from refresh interval)`
                    : '60 Hz default baseline assumption · ~8.33 ms estimated midpoint model'
                }
              >
                <Monitor 
                  size={11} 
                  className={
                    refreshInfo.status === 'detecting' 
                      ? "text-[var(--accent)] animate-pulse shrink-0" 
                      : refreshInfo.source === 'measured' 
                      ? "text-[var(--accent)] shrink-0" 
                      : refreshInfo.source === 'estimated' 
                      ? "text-amber-400 shrink-0" 
                      : "text-[var(--text-muted)] shrink-0"
                  } 
                />
                <span className="truncate">
                  {refreshInfo.status === 'detecting'
                    ? 'Detecting display cadence…'
                    : refreshInfo.source === 'measured'
                    ? `${refreshInfo.hz} Hz · ~${refreshInfo.displayDelayOffsetMs} ms est. midpoint`
                    : refreshInfo.source === 'estimated'
                    ? `~${refreshInfo.hz} Hz · ~${refreshInfo.displayDelayOffsetMs} ms est. midpoint`
                    : '60 Hz · ~8.33 ms est. midpoint (def)'
                  }
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 variants={fadeItemVariants} className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-5 text-[var(--text-primary)]">
              Measure your reaction time and cognitive performance.
            </motion.h1>

            {/* Description Paragraph - Aligned with actual protocols */}
            <motion.p variants={fadeItemVariants} className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl font-normal leading-relaxed text-center lg:text-left mb-8">
              PULSE evaluates visual reaction latency, directional choice speed, and working memory through research-informed assessment protocols.
            </motion.p>

            {/* Primary Action Button */}
            <motion.div variants={fadeItemVariants} className="flex items-center gap-3">
              <Link 
                to={ROUTES.ASSESSMENTS}
                id="start-lab-btn"
                onClick={() => setIsNavigating(true)}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-slate-950 font-medium text-sm px-6 py-3 rounded-md inline-flex items-center justify-center gap-2 cursor-pointer transition-[background-color,transform] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span>Start assessments</span>
                {isNavigating ? (
                  <RefreshCw size={14} className="animate-spin text-slate-950" />
                ) : (
                  <ArrowRight size={16} />
                )}
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
                    className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-[var(--text-primary)]">
                          {card.label}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {card.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-[var(--border-subtle)] py-4 px-6 sm:px-10 text-center text-xs text-[var(--text-muted)] font-mono z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>PULSE v2.1</span>
          <span>•</span>
          <span>Open Cognitive Benchmark</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to={ROUTES.PRIVACY}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Privacy
          </Link>
          <Link 
            to={ROUTES.DATASET}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Dataset
          </Link>
        </div>
      </footer>

      {/* Floating Auth Notice: Presents connectivity status without causing hero layout shift or content reflow */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="alert"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl p-3.5 rounded-lg bg-[var(--surface-1)]/95 backdrop-blur-md border border-rose-500/30 shadow-2xl text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <div className="text-xs">
                <span className="font-semibold text-rose-200">Notice: </span>
                <span>Session tracking is temporarily offline. Assessments continue locally and will sync automatically.</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => retryAuth()}
              disabled={isConnecting}
              aria-label="Retry connection"
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 active:scale-[0.97] text-rose-200 text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <RefreshCw size={12} className={isConnecting ? "animate-spin" : ""} />
              <span>{isConnecting ? "Retrying..." : "Retry"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
