import { ShieldCheck, Lock, Users, Database, Globe, RefreshCw } from 'lucide-react';
import { Navbar } from './Navbar';
import { motion } from 'motion/react';
import { SEO } from './SEO';

export function ResearchPrivacyPolicy({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col">
      <SEO 
        title="Research Data Ethics & Privacy Policy | PULSE Mobile"
        description="Our commitment to transparent research standards, strict data anonymization, telemetry consent guidelines, and open scientific integrity."
        canonicalUrl="https://pulse-lab.in/privacy"
      />
      <Navbar currentView="privacy" onNavigate={onNavigate} />
      
      <main 
        className="flex-1 w-full max-w-3xl mx-auto px-4 py-8"
        style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-8"
        >
          <header className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)]">
              <ShieldCheck size={26} />
            </div>
            <h1 className="font-heading font-black text-3xl md:text-4xl text-[var(--text-main)] tracking-wide uppercase">
              Research Privacy Policy
            </h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
              At PULSE (Precision User Latency &amp; Stimulus Evaluator), your privacy is fundamental to our scientific mission. This document outlines how we handle, anonymize, and protect the data generated across our open cognitive assessments.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] pt-1">
              <span>Last updated: September 2026</span>
              <span>•</span>
              <a 
                href="https://github.com/Affan0786isOP/PULSE-2.1" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <Globe size={12} />
                <span>Open Source Repository</span>
              </a>
            </div>
          </header>

          {/* Section 1: Data Collection & Telemetry */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Data Collection &amp; Telemetry</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We strictly collect only the performance telemetry and environmental parameters necessary for empirical cognitive research. We do not track GPS location, persistent hardware serials, or cross-site browsing activity.
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">Cognitive Assessment Metrics:</strong> Reaction times (latency in milliseconds), foreperiod delay categories, directional choice accuracy, colour recognition scores, spatial block sequences, and digit memory spans.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Hardware &amp; Display Context:</strong> Nominal display refresh rate (Hz) and estimated frame interval to calibrate visual presentation offsets. Device environment category (desktop vs mobile viewport) and general operating platform family.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Transient Storage &amp; Cookies:</strong> Local storage keys (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_user_settings</code>, <code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_welcome_seen</code>, <code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_refresh_rate_cached</code>) and transient routing cookies (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_force_desktop</code>, <code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_force_mobile</code>) strictly store client-side preferences and viewport routing selections.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Server Access Logs:</strong> Standard ephemeral HTTP server logs (IP address, user-agent string, timestamp) are retained temporarily by cloud infrastructure solely for DDoS mitigation, rate limiting, and system availability.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Anonymization & Privacy Boundary */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Anonymization &amp; Privacy Boundary</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                PULSE separates operational authentication from public research observations to maintain strict participant anonymity:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">No Personally Identifiable Information (PII):</strong> We do not ask for or record names, email addresses, phone numbers, or physical addresses.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Anonymous Authentication:</strong> Firebase anonymous authentication generates an ephemeral session credential to authorize database submissions. This internal identifier is kept strictly within private server-side collections and is never exported or exposed in the public research dataset.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Coarsened Temporal Boundaries:</strong> In the public research dataset, individual timestamps are coarsened to monthly cohorts (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">YYYY-MM</code>) to prevent temporal linkage or activity profiling.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Public Leaderboard Display Names:</strong> If you choose to submit a score to the public leaderboard, your self-chosen display name is publicly visible alongside your score, but is not linked to private accounts or cross-session tracking identifiers.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Age Cohorts & Youth Safeguards */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Age Cohorts &amp; Minors</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We categorize age by broad demographic cohorts (e.g., "18–25", "26–35") rather than collecting specific dates of birth, avoiding age-based identification.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">Safeguards for Minors</h3>
                <p className="text-sm text-amber-400/80 leading-relaxed">
                  Participants in the "Children (8–12)" or "Adolescents (13–17)" brackets are classified strictly into coarsened demographic cohorts without personal identifiers or exact birthdates. In addition, timestamp precision is rounded to monthly buckets (<code className="text-xs bg-amber-500/20 px-1 py-0.5 rounded">YYYY-MM</code>), leaderboard query endpoints require authenticated session context, and server-side rate limiters restrict automated scraping. Parental or guardian guidance is recommended.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Persistence & Retention */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Data Persistence &amp; Cache Clearing</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Validated assessment trials and aggregate leaderboard submissions are authoritatively persisted in our managed cloud database (Firestore). Because research submissions are completely anonymous and stripped of identifying personal metadata, individual historical records cannot be retroactively associated with or isolated for a specific anonymous individual.
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Selecting <strong className="text-[var(--text-primary)]">Reset Local App Cache</strong> in Settings immediately wipes all local storage, calibration caches, and device preferences stored in your browser.
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
