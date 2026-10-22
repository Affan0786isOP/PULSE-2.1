import React from 'react';
import { ShieldCheck, Lock, Users, Database, RefreshCw, Layers, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { PageShell } from './layout/PageShell';

export function ResearchPrivacyPolicy({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return (
    <PageShell
      currentView="privacy"
      onNavigate={onNavigate}
      decorativeWaves="bottom"
      maxWidth="4xl"
      contentClassName="py-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-8 w-full"
      >
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] dark:bg-[#181D23] border border-[#BFDBFE] dark:border-[#22C7D6]/40 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6]">
            <ShieldCheck size={26} />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-[#090D1A] dark:text-white tracking-wide uppercase">
            Research Privacy Policy
          </h1>
          <p className="text-[#334155] dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-[65ch]">
            This policy explains how PULSE (Precision User Latency &amp; Stimulus Evaluator) handles local settings, research records, and optional public leaderboard entries, including the limits of the current removal process.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
            <span>Last updated: October 2026</span>
            <span>•</span>
            <span>Data &amp; methodology information</span>
          </div>
        </header>

        {/* Section 1: Four-Tier Data Architecture */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Data Architecture &amp; Classification</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              PULSE separates data into four tiers to keep participant records isolated from local settings and server logs:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono bg-slate-50/60 dark:bg-[#181D23]/60">
                    <th className="py-2.5 px-3 font-semibold">Tier</th>
                    <th className="py-2.5 px-3 font-semibold">Storage Location</th>
                    <th className="py-2.5 px-3 font-semibold">Contents</th>
                    <th className="py-2.5 px-3 font-semibold">Privacy Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[#334155] dark:text-slate-300">
                  <tr>
                    <td className="py-3 px-3 font-mono font-semibold text-[#0066FF] dark:text-[#22C7D6]">1. Local Client State</td>
                    <td className="py-3 px-3">Browser Storage / Cookies</td>
                    <td className="py-3 px-3">User preferences, welcome dismissal flag, legacy timing cache keys, routing flags</td>
                    <td className="py-3 px-3 text-xs">Client-only; never uploaded automatically to databases</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-semibold text-emerald-600">2. Cloud Research Records</td>
                    <td className="py-3 px-3">Firestore (<code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">publicDataset</code>)</td>
                    <td className="py-3 px-3">Assessment trials, unadjusted response latencies, accuracy, and coarsened cohort (<code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">YYYY-MM</code>)</td>
                    <td className="py-3 px-3 text-xs">Fully anonymized; no PII, IP addresses, or persistent user IDs</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-semibold text-amber-600">3. Public Leaderboards</td>
                    <td className="py-3 px-3">Firestore (<code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">leaderboardResults</code>)</td>
                    <td className="py-3 px-3">Self-chosen display alias, test score, device category, submission timestamp</td>
                    <td className="py-3 px-3 text-xs">Publicly viewable by alias; no private account linkage</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-semibold text-purple-600">4. Infrastructure Logs</td>
                    <td className="py-3 px-3">Cloudflare / Hosting / Vercel</td>
                    <td className="py-3 px-3">Ephemeral HTTP access logs (IP, user agent) &amp; cookieless aggregate traffic metrics</td>
                    <td className="py-3 px-3 text-xs">Operational security &amp; DDoS protection only; strictly decoupled from research data</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 2: Telemetry & Calibration Parameters */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Assessment Timing &amp; Telemetry</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              PULSE records task responses and selected device context needed to interpret assessment results:
            </p>
            <ul className="text-sm text-[#334155] dark:text-slate-300 list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#090D1A] dark:text-white">Cognitive Assessment Metrics:</strong> Reaction times (raw latency in milliseconds), foreperiod delay categories (e.g. short vs. long randomized preparatory intervals), directional discrimination choices, colour recognition accuracy, spatial sequence spans, and number memory spans.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Live-Timer Pacing &amp; Response Timing:</strong> PULSE targets an average of approximately 60 live-timer UI updates per second using browser animation-frame timestamps. This software pacing does not force the physical display refresh rate or guarantee uniform frame intervals. Reaction latency is measured from high-resolution monotonic browser timestamps without theoretical hardware-dependent offset subtraction. PULSE no longer actively measures screen cadence; legacy <code>pulse_refresh_rate_*</code> local keys may still be cleared.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Device &amp; Input Environment:</strong> Viewport dimensions, input modality (pointer coarse vs. fine, touch capability), and general operating system family. We do not inspect device serial numbers, MAC addresses, or persistent advertising identifiers.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Third-Party Performance Telemetry:</strong> We use cookieless analytics (Vercel Analytics) to monitor site reliability, errors, and load times. This does not track you across other sites or fingerprint your device.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Anonymization & Authentication Boundary */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Anonymization &amp; Authentication Boundary</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              PULSE separates database authentication from the research dataset to keep participants anonymous:
            </p>
            <ul className="text-sm text-[#334155] dark:text-slate-300 list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#090D1A] dark:text-white">No Personally Identifiable Information (PII):</strong> We never collect names, email addresses, phone numbers, location coordinates, or payment details.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Anonymous Authentication:</strong> Firebase generates a temporary token so the app can write to the database. This token is used only for security rules and is never saved with the research data.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Coarsened Temporal Boundaries:</strong> Public records only show the month and year of the test (<code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">YYYY-MM</code>), preventing anyone from tracking participants by the exact time they played.
              </li>
              <li>
                <strong className="text-[#090D1A] dark:text-white">Public Leaderboard Display Names:</strong> If you voluntarily post to the public leaderboard, your chosen display alias is shown publicly with your score. We advise participants not to use their real full name as an alias.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Age Cohorts & Minor Safeguards */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Age Cohorts &amp; Minor Safeguards</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              We collect age in brackets (e.g., "18–25", "26–35") rather than exact birth dates.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">Safeguards for Minors</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Participants in younger brackets (e.g., "8–12" or "13–17") are recorded without names or birth dates. Because we only save the month of the test (<code className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded font-mono border border-amber-300 dark:border-amber-700/60">YYYY-MM</code>), young participants cannot be individually identified. We encourage parents and guardians to supervise minor participation.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Data Persistence & Local Cache Control */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Data Persistence &amp; Local Storage Controls</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              Assessment results and leaderboard entries are saved in Firestore. Leaderboard opt-in entries include the alias you choose and are publicly visible until hidden or deleted by an administrator. The app does not currently provide a self-service, verified request workflow to find and remove a participant's records. Because aliases are not identity-verified and research records do not include contact details, a request alone cannot reliably identify the relevant records. Do not use your real name or contact details as a public alias.
            </p>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#090D1A] dark:text-white">Local Storage &amp; Cache Clearing</h3>
              <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
                Selecting <strong className="text-[#090D1A] dark:text-white">Reset Local App Cache</strong> in Settings removes all PULSE-specific browser keys (<code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">pulse_user_settings</code>, <code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">pulse_welcome_seen</code>, <code className="text-xs bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-[#BFDBFE] dark:border-slate-700">pulse_refresh_rate_cached</code>), session storage, and PULSE routing cookies. It does not affect other website data or general browser cache.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Contact & Data Inquiries */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 className="font-heading font-bold text-xl text-[#090D1A] dark:text-white tracking-wide">Contact &amp; Data Inquiries</h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed max-w-[65ch]">
              For questions about how PULSE handles data or methodology, review the platform information and privacy policy.
            </p>
            <div className="pt-1">
              <a
                href="/about"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E0F2FE] dark:bg-[#181D23] hover:bg-[#BAE6FD] dark:hover:bg-slate-800 text-[#0066FF] dark:text-[#22C7D6] border border-[#BFDBFE] dark:border-slate-700 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
              >
                <span>About PULSE</span>
              </a>
            </div>
          </div>
        </section>
      </motion.div>
    </PageShell>
  );
}
