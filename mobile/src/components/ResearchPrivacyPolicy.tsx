import { ShieldCheck, Lock, Users, Database, RefreshCw, Layers, HelpCircle } from 'lucide-react';
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
            <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed max-w-[65ch]">
              This policy explains how PULSE (Precision User Latency &amp; Stimulus Evaluator) handles local settings, research records, and optional public leaderboard entries, including the limits of the current removal process.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)] pt-1">
              <span>Last updated: September 2026</span>
              <span>•</span>
              <span>Data &amp; methodology information</span>
            </div>
          </header>

          {/* Section 1: Four-Tier Data Architecture */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Layers size={20} className="text-[var(--cyan-primary)]" />
              <h2 className="font-heading font-bold text-xl text-[var(--text-main)] tracking-wide">Data Architecture &amp; Classification</h2>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                PULSE separates data into four tiers to keep participant records isolated from local settings and server logs:
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                To ensure the assessments are accurate across different devices, PULSE records test scores alongside device and display settings:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">Cognitive Assessment Metrics:</strong> Reaction times (raw latency in milliseconds), foreperiod delay categories (e.g. short vs. long randomized preparatory intervals), directional discrimination choices, colour recognition accuracy, spatial sequence spans, and number memory spans.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Display Calibration &amp; Timing Correction:</strong> Measured or estimated display refresh rate (Hz), frame intervals, and calibrated display delay offsets (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">displayDelayOffsetMs</code>) to account for visual delay on different screens.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Device &amp; Input Environment:</strong> Viewport dimensions, input modality (pointer coarse vs. fine, touch capability), and general operating system family. We do not inspect device serial numbers, MAC addresses, or persistent advertising identifiers.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Third-Party Performance Telemetry:</strong> We use cookieless analytics (Vercel Analytics) to monitor site reliability, errors, and load times. This does not track you across other sites or fingerprint your device.
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                PULSE separates database authentication from the research dataset to keep participants anonymous:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">No Personally Identifiable Information (PII):</strong> We never collect names, email addresses, phone numbers, location coordinates, or payment details.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Anonymous Authentication:</strong> Firebase generates a temporary token so the app can write to the database. This token is used only for security rules and is never saved with the research data.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Coarsened Temporal Boundaries:</strong> Public records only show the month and year of the test (<code className="text-xs bg-[var(--cyan-badge-bg)] px-1 py-0.5 rounded">YYYY-MM</code>), preventing anyone from tracking participants by the exact time they played.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Public Leaderboard Display Names:</strong> If you voluntarily post to the public leaderboard, your chosen display alias is shown publicly with your score. We advise participants not to use their real full name as an alias.
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We collect age in brackets (e.g., "18–25", "26–35") rather than exact birth dates.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">Safeguards for Minors</h3>
                <p className="text-sm text-amber-400/90 leading-relaxed">
                  Participants in younger brackets (e.g., "8–12" or "13–17") are recorded without names or birth dates. Because we only save the month of the test (<code className="text-xs bg-amber-500/20 px-1 py-0.5 rounded">YYYY-MM</code>), young participants cannot be individually identified. We encourage parents and guardians to supervise minor participation.
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Assessment results and leaderboard entries are saved in Firestore. Leaderboard opt-in entries include the alias you choose and are publicly visible until hidden or deleted by an administrator. The app does not currently provide a self-service, verified request workflow to find and remove a participant's records. Because aliases are not identity-verified and research records do not include contact details, a request alone cannot reliably identify the relevant records. Do not use your real name or contact details as a public alias.
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[65ch]">
                For questions about how PULSE handles data or methodology, review the platform information and privacy policy.
              </p>
              <div className="pt-1">
                <a
                  href="/about"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cyan-badge-bg)] hover:bg-[var(--cyan-badge-border)] active:scale-95 active:opacity-90 text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)] rounded-lg text-sm font-medium transition-[transform,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span>About PULSE</span>
                </a>
              </div>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
