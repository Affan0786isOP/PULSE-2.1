import { ShieldCheck, Lock, Users, Database, Globe, RefreshCw, Layers, ExternalLink, HelpCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { motion } from 'motion/react';
import { SEO } from './SEO';

export function ResearchPrivacyPolicy({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col">
      <SEO 
        title="Research Data Ethics & Privacy Policy | PULSE"
        description="Our commitment to transparent research standards, strict data anonymization, telemetry consent guidelines, and open scientific integrity."
        canonicalUrl="https://pulse-lab.in/privacy"
      />
      <Navbar currentView="privacy" onNavigate={onNavigate} />
      
      <main 
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-8"
        style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-8"
        >
          {/* Header */}
          <header className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)]">
              <ShieldCheck size={26} />
            </div>
            <h1 className="font-heading font-black text-3xl md:text-4xl text-[var(--text-main)] tracking-wide uppercase">
              Research Privacy Policy
            </h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
              At PULSE (Precision User Latency &amp; Stimulus Evaluator), privacy and open scientific transparency are core to our mission. This policy details our data governance practices, telemetry architecture, multi-tiered data boundaries, and local storage controls.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)] pt-1">
              <span>Last updated: September 2026</span>
              <span>•</span>
              <a 
                href="https://github.com/Affan0786isOP/PULSE-2.1" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[var(--cyan-primary)] hover:underline inline-flex items-center gap-1"
              >
                <Globe size={12} />
                <span>Open-Source Repository</span>
              </a>
              <span>•</span>
              <a 
                href="https://github.com/Affan0786isOP/PULSE-2.1/issues" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[var(--cyan-primary)] hover:underline inline-flex items-center gap-1"
              >
                <HelpCircle size={12} />
                <span>Data Inquiries &amp; Requests</span>
              </a>
            </div>
          </header>

          {/* Section 1: Four-Tier Data Architecture */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Layers size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Data Architecture &amp; Classification</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                PULSE operates on a strict multi-tier data model designed to isolate ephemeral client state, public research observations, competitive rankings, and operational infrastructure logs:
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                      <th className="py-2.5 pr-4 font-semibold">Tier</th>
                      <th className="py-2.5 px-4 font-semibold">Storage Location</th>
                      <th className="py-2.5 px-4 font-semibold">Contents</th>
                      <th className="py-2.5 pl-4 font-semibold">Privacy Boundary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]/50 text-[var(--text-secondary)]">
                    <tr>
                      <td className="py-3 pr-4 font-mono font-medium text-[var(--cyan-primary)]">1. Local Client State</td>
                      <td className="py-3 px-4">Browser Storage / Cookies</td>
                      <td className="py-3 px-4">User preferences, welcome dismissal flag, hardware calibration cache, routing flags</td>
                      <td className="py-3 pl-4 text-xs">Client-only; never uploaded automatically to databases</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-medium text-emerald-400">2. Cloud Research Records</td>
                      <td className="py-3 px-4">Firestore (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">publicDataset</code>)</td>
                      <td className="py-3 px-4">Assessment trials, response latencies, accuracy, display delay corrections, coarsened cohort (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">YYYY-MM</code>)</td>
                      <td className="py-3 pl-4 text-xs">Fully anonymized; no PII, IP addresses, or persistent user IDs</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-medium text-amber-400">3. Public Leaderboards</td>
                      <td className="py-3 px-4">Firestore (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">leaderboardResults</code>)</td>
                      <td className="py-3 px-4">Self-chosen display alias, test score, device category, submission timestamp</td>
                      <td className="py-3 pl-4 text-xs">Publicly viewable by alias; no private account linkage</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-medium text-purple-400">4. Infrastructure Logs</td>
                      <td className="py-3 px-4">Cloudflare / Hosting / Vercel</td>
                      <td className="py-3 px-4">Ephemeral HTTP access logs (IP, user agent) &amp; cookieless aggregate traffic metrics</td>
                      <td className="py-3 pl-4 text-xs">Operational security &amp; DDoS protection only; strictly decoupled from research data</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 2: Telemetry & Calibration Parameters */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Telemetry &amp; Calibration Parameters</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                To guarantee empirical precision across diverse consumer hardware, PULSE records performance metrics alongside experimental and display calibration metadata:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">Cognitive Assessment Metrics:</strong> Reaction times (raw latency in milliseconds), foreperiod delay categories (e.g. short vs. long randomized preparatory intervals), directional discrimination choices, colour recognition accuracy, spatial sequence spans, and number memory spans.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Display Calibration &amp; Timing Correction:</strong> Measured or estimated display refresh rate (Hz), frame intervals, and calibrated display delay offsets (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">displayDelayOffsetMs</code>) to normalize visual presentation latency across heterogeneous screens.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Device &amp; Input Environment:</strong> Viewport dimensions, input modality (pointer coarse vs. fine, touch capability), and general operating system family. We do not inspect device serial numbers, MAC addresses, or persistent advertising identifiers.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Third-Party Performance Telemetry:</strong> We utilize privacy-first, cookieless analytics (Vercel Analytics) strictly for aggregate reliability monitoring, error rates, and load performance without cross-site tracking or personal fingerprinting.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Anonymization & Authentication Boundary */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Anonymization &amp; Authentication Boundary</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                PULSE separates operational authentication tokens from published research observations to ensure complete participant anonymity:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">No Personally Identifiable Information (PII):</strong> We never collect names, email addresses, phone numbers, location coordinates, or payment details.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Anonymous Authentication:</strong> Firebase anonymous authentication generates an ephemeral token used solely to authorize database writes under Firestore security rules. This token is restricted to internal operational validation and is never included in the public research dataset.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Coarsened Temporal Boundaries:</strong> Public dataset records coarsen timestamps to monthly buckets (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">YYYY-MM</code>) to eliminate the possibility of correlation attacks or time-of-day participant tracking.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Public Leaderboard Display Names:</strong> If you voluntarily post to the public leaderboard, your chosen display alias is displayed publicly with your score. We advise participants not to use their real full name as an alias.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Age Cohorts & Minor Safeguards */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Age Cohorts &amp; Minor Safeguards</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Age context is collected solely in broad demographic brackets (e.g., "18–25", "26–35") rather than specific dates of birth, preventing precise age identification.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">Safeguards for Minors</h3>
                <p className="text-sm text-amber-400/90 leading-relaxed">
                  Participants in younger brackets (e.g. "8–12" or "13–17") are classified strictly into coarsened cohorts without names or dates of birth. Combined with monthly timestamp coarsening (<code className="text-xs bg-amber-500/20 px-1 py-0.5 rounded">YYYY-MM</code>) and rate-limited endpoints, young participants cannot be individually identified. We encourage parents and guardians to supervise minor participation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Data Persistence & Local Cache Control */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Data Persistence &amp; Local Storage Controls</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Validated assessment submissions and aggregate leaderboard entries are persisted in our managed cloud database (Firestore). Because research submissions are completely anonymous and stripped of identifying tokens, individual historical research entries cannot be retroactively linked or isolated for an individual participant.
              </p>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Local Storage &amp; Cache Clearing</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Selecting <strong className="text-[var(--text-primary)]">Reset Local App Cache</strong> in Settings removes all PULSE-specific browser keys (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_user_settings</code>, <code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_welcome_seen</code>, <code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">pulse_refresh_rate_cached</code>), session storage, and PULSE routing cookies. It does not affect other website data or general browser cache.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Contact & Data Inquiries */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <HelpCircle size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Contact &amp; Data Inquiries</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-3">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                If you have questions regarding data handling, methodology transparency, or privacy practices within the PULSE project, please contact our maintainers or file an issue through our public tracker:
              </p>
              <div className="pt-1">
                <a 
                  href="https://github.com/Affan0786isOP/PULSE-2.1/issues" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cyan-badge-bg)] hover:bg-[var(--cyan-badge-border)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)] rounded-lg text-sm font-medium transition-colors"
                >
                  <span>Submit an Inquiry on GitHub Issues</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
