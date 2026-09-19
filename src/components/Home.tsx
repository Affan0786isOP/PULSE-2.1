import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Database, ArrowRight, Monitor, Trophy, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, Variants } from 'motion/react';
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" }
  }
};

const cardsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0
    }
  }
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.32, ease: "easeOut" }
  }
};

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isReady, isConnecting, authError, retryAuth } = useAuth();
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
      <main className="w-full max-w-[1140px] mx-auto px-6 sm:px-10 z-10 flex-1 flex flex-col justify-center py-8 lg:py-16">
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] items-center gap-10 lg:gap-14 my-auto">
          
          {/* Left Column: Tag, Headline, Description, Button */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Top Tag Badge */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-medium">
                <span>Cognitive reaction &amp; memory assessments</span>
              </div>

              {refreshInfo.status === 'detecting' ? (
                <div 
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono"
                  aria-label="Detecting display refresh rate"
                >
                  <Monitor size={11} className="text-[var(--accent)] animate-pulse" />
                  <span>Detecting…</span>
                </div>
              ) : refreshInfo.source === 'measured' ? (
                <div 
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono"
                  title={`${refreshInfo.hz} Hz calibrated display · ~${refreshInfo.displayDelayOffsetMs} ms approximate midpoint model`}
                >
                  <Monitor size={11} className="text-[var(--accent)]" />
                  <span>{refreshInfo.hz} Hz · ~{refreshInfo.displayDelayOffsetMs} ms midpoint</span>
                </div>
              ) : refreshInfo.source === 'estimated' ? (
                <div 
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono"
                  title={`~${refreshInfo.hz} Hz calculated cadence · ~${refreshInfo.displayDelayOffsetMs} ms approximate midpoint model`}
                >
                  <Monitor size={11} className="text-amber-400" />
                  <span>~{refreshInfo.hz} Hz (Estimated)</span>
                </div>
              ) : (
                <div 
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono"
                  title="60 Hz default baseline assumption · ~8.33 ms approximate midpoint model"
                >
                  <Monitor size={11} className="text-[var(--text-muted)]" />
                  <span>60 Hz · fallback</span>
                </div>
              )}
            </motion.div>

            {authError && (
              <motion.div variants={itemVariants} className="w-full mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-200">Cloud Notice: </span>
                    <span>Cloud session tracking is temporarily unavailable. Assessment session tracking will retry automatically.</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => retryAuth()}
                  disabled={isConnecting}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 active:scale-[0.97] text-rose-200 text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isConnecting ? "animate-spin" : ""} />
                  <span>{isConnecting ? "Retrying..." : "Retry Connection"}</span>
                </button>
              </motion.div>
            )}

            {/* Main Headline */}
            <motion.h1 variants={itemVariants} className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-5 text-[var(--text-primary)]">
              Measure your reaction time and cognitive performance.
            </motion.h1>

            {/* Description Paragraph - Aligned with actual protocols */}
            <motion.p variants={itemVariants} className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl font-normal leading-relaxed text-center lg:text-left mb-8">
              PULSE evaluates visual reaction latency, directional choice speed, and working memory through research-informed assessment protocols.
            </motion.p>

            {/* Primary Action Button */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <Link 
                to="/assessments"
                id="start-lab-btn"
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-slate-950 font-medium text-sm px-6 py-3 rounded-md inline-flex items-center justify-center gap-2 cursor-pointer transition-[background-color,transform] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span>Start assessments</span>
                {isConnecting ? (
                  <RefreshCw size={14} className="animate-spin text-slate-950" />
                ) : (
                  <ArrowRight size={16} />
                )}
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column: Navigation Cards - Native accessible links */}
          <motion.div 
            variants={cardsContainerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[360px] flex flex-col gap-2.5 shrink-0 mx-auto lg:mx-0"
          >
            {/* Card 0: LEADERBOARD */}
            <motion.div variants={cardItemVariants}>
              <Link
                to="/leaderboard"
                aria-label="View Leaderboard — Verified cohort rankings"
                className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      Leaderboard
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Verified cohort rankings
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
              </Link>
            </motion.div>

            {/* Card 1: DATASET */}
            <motion.div variants={cardItemVariants}>
              <Link
                to="/dataset"
                aria-label="View Open Research Dataset — Population telemetry and observations"
                className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
                    <Database size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      Research Dataset
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Population telemetry &amp; observations
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
              </Link>
            </motion.div>

            {/* Card 2: IMPROVE */}
            <motion.div variants={cardItemVariants}>
              <Link
                to="/improve"
                aria-label="View Improve — Factors that can affect reaction performance"
                className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      Improve
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Factors that can affect reaction performance
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
              </Link>
            </motion.div>

            {/* Card 3: PRIVACY POLICY */}
            <motion.div variants={cardItemVariants}>
              <Link
                to="/privacy"
                aria-label="View Privacy Policy — Research data ethics and anonymization"
                className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      Privacy Policy
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Research data ethics &amp; anonymization
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
              </Link>
            </motion.div>
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
            to="/privacy"
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Privacy
          </Link>
          <Link 
            to="/dataset"
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Dataset
          </Link>
        </div>
      </footer>
    </div>
  );
}
