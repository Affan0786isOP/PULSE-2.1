import { ArrowLeft, ShieldCheck, Lock, Trash2, Users, Database } from 'lucide-react';
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
      <Navbar currentView="privacy" onNavigate={onNavigate} onBack={() => onNavigate('home')} />
      
      <main 
        className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 overflow-y-auto"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}
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
              At PULSE (Precision User Latency & Stimulus Evaluator), your privacy is our highest priority. This document outlines how we handle, anonymize, and protect the data you generate during cognitive assessments.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Data Collection & Use</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                We strictly collect only the performance metrics necessary for cognitive research and baseline establishment. We do not track your location, hardware identifiers, or browser fingerprints.
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li><strong className="text-[var(--text-primary)]">Metrics:</strong> Reaction times, accuracy percentages, memory spans, and sequence lengths.</li>
                <li><strong className="text-[var(--text-primary)]">Hardware Context:</strong> Display refresh rate (to normalize visual latency).</li>
                <li><strong className="text-[var(--text-primary)]">Usage:</strong> Generating population baselines, demographic distributions, and global leaderboards.</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Anonymization Practices</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                All submissions to the public leaderboard are strictly anonymous.
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2 mt-4">
                <li><strong className="text-[var(--text-primary)]">No PII or Linkage Hashes:</strong> We do not store your name, email, or IP address alongside assessment records. Public research dataset observations contain no participant linkage hashes or exact completion timestamps.</li>
                <li><strong className="text-[var(--text-primary)]">Coarsened Temporal Boundaries:</strong> Public dataset record dates are strictly coarsened to monthly buckets (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">YYYY-MM</code>).</li>
                <li><strong className="text-[var(--text-primary)]">Cryptographic Attestation:</strong> Server-generated HMAC tokens ensure metrics are legitimate without requiring user accounts or identification in public research data.</li>
                <li><strong className="text-[var(--text-primary)]">Leaderboards:</strong> If you opt into the Leaderboard, your chosen "Display Name" is public, but it is not permanently linked to your private browser state.</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Age Cohorts & Minors</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                We collect age cohort brackets (e.g., "Young adults (18–25)") rather than exact birthdates to prevent age-based fingerprinting.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">Safeguards for Minors</h3>
                <p className="text-sm text-amber-400/80 leading-relaxed">
                  Participants selecting the "Children (8–12)" or "Adolescents (13–17)" brackets are classified strictly into coarsened demographic cohorts without personal identifiers or exact birthdates. In addition, timestamp precision is rounded to monthly buckets (<code className="text-xs bg-amber-500/20 px-1 py-0.5 rounded">YYYY-MM</code>), leaderboard query endpoints require authenticated session context, and server-side rate limiters restrict automated scraping of attestation endpoints. Parental guidance is recommended.
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] uppercase tracking-wide">Data Persistence & Deletion</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                All validated assessment records and global leaderboard rankings are authoritatively managed and securely persisted in the server database (Firebase / Firestore). Data is submitted anonymously without personal identifying information (PII) or user accounts, meaning individual anonymous records cannot be retroactively isolated for individual deletion. Resetting local app cache in settings clears only transient client-side UI display preferences from your device.
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
