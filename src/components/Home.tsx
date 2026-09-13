import React from 'react';
import { Zap, Activity, Database, ArrowRight, Monitor, Trophy, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import { Navbar } from './Navbar';
import { useAuth } from '../AuthContext';
import { useRefreshRate } from '../lib/useRefreshRate';
import { SEO } from './SEO';

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isReady, isAuthenticated, authError, retryAuth } = useAuth();
  const refreshInfo = useRefreshRate();

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PULSE — Precision User Latency & Stimulus Evaluator",
    "url": "https://pulse-lab.in/",
    "description": "An open-source, browser-based cognitive benchmarking suite measuring sensory-motor reflex, visual discrimination, and working memory with millisecond precision."
  };

  if (!isReady) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
          <div className="text-sm font-semibold tracking-normal text-[var(--text-primary)]">PULSE</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Initializing assessment environment...</div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans selection:bg-cyan-500/30 overflow-x-hidden relative flex flex-col justify-between">
      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="An open-source, browser-based cognitive benchmarking suite measuring sensory-motor reflex, visual discrimination, and working memory with millisecond precision."
        schema={homeSchema}
      />
      {/* Top Navbar Header */}
      <Navbar currentView="home" onNavigate={onNavigate} />

      {/* Main Hero Section */}
      <main className="w-full max-w-[1140px] mx-auto px-6 sm:px-10 z-10 flex-1 flex flex-col justify-center py-8 lg:py-16">
        
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 my-auto">
          
          {/* Left Column: Tag, Headline, Description, Button */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-3/5 flex flex-col items-center lg:items-start text-center lg:text-left shrink-0"
          >
            {/* Top Tag Badge */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-medium">
                <span>Cognitive reaction &amp; memory assessments</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-mono">
                <Monitor size={12} className="text-[var(--accent)]" />
                <span>{refreshInfo.hz} Hz ({refreshInfo.displayDelayOffsetMs} ms frame offset)</span>
              </div>
            </motion.div>

            {authError && (
              <motion.div variants={itemVariants} className="w-full mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-200">Firebase Connection Required: </span>
                    <span>{authError} Valid server authentication is required for assessments.</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => retryAuth()}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 active:scale-[0.97] text-rose-200 text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </motion.div>
            )}

            {/* Main Headline */}
            <motion.h1 variants={itemVariants} className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-5 text-[var(--text-primary)]">
              Measure your reaction time and cognitive performance.
            </motion.h1>

            {/* Description Paragraph */}
            <motion.p variants={itemVariants} className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl font-normal leading-relaxed text-center lg:text-left mb-8">
              PULSE evaluates human reaction latency, visual search speed, and working memory through research-calibrated assessment protocols.
            </motion.p>

            {/* Primary Action Button */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <motion.button 
                type="button"
                id="start-lab-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('assessments')}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-medium text-sm px-6 py-3 rounded-md inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <span>Start assessments</span>
                <ArrowRight size={16} />
              </motion.button>
              
            </motion.div>
          </motion.div>

          {/* Right Column: Navigation Cards */}
          <motion.div 
            variants={cardsContainerVariants}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-2/5 max-w-[380px] flex flex-col gap-2.5 shrink-0"
          >
            {/* Card 0: LEADERBOARD */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ x: 3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('leaderboard')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('leaderboard'); } }}
              tabIndex={0}
              role="button"
              aria-label="View Leaderboard - Verified cohort rankings"
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between cursor-pointer transition-colors group"
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
              <ArrowRight size={16} className="text-[var(--border-subtle)] shrink-0" />
            </motion.div>

            {/* Card 0.5: DATASET */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ x: 3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('dataset')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('dataset'); } }}
              tabIndex={0}
              role="button"
              aria-label="View Open Research Dataset - Population telemetry & observations"
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between cursor-pointer transition-colors group"
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
                    Population telemetry & observations
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--border-subtle)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
            </motion.div>

            {/* Card 1: IMPROVE */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ x: 3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('improve')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('improve'); } }}
              tabIndex={0}
              role="button"
              aria-label="View Improve - Factors influencing neural latency"
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between cursor-pointer transition-colors group"
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
                    Factors influencing neural latency
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--border-subtle)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-[color,transform] shrink-0" />
            </motion.div>

            {/* Card 4: PRIVACY POLICY */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ x: 3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('privacy')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('privacy'); } }}
              tabIndex={0}
              role="button"
              aria-label="View Privacy Policy - Research data ethics and anonymization"
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md p-3.5 flex items-center justify-between cursor-pointer transition-colors group"
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
                    Research data ethics & anonymization
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--border-subtle)] shrink-0" />
            </motion.div>

          </motion.div>

        </div>

      </main>
    </div>
  );
}
