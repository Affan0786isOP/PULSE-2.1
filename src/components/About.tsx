import React from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileText, 
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../lib/version';
import { PageShell } from './layout/PageShell';

const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://pulse-lab.in/about#webpage",
      "url": "https://pulse-lab.in/about",
      "name": "About PULSE — Cognitive Benchmarking Suite",
      "description": "Learn about PULSE (Precision User Latency & Stimulus Evaluator), our standardized browser-based cognitive tests, telemetry engine, and privacy standards.",
      "isPartOf": { "@id": "https://pulse-lab.in/#website" },
      "about": { "@id": "https://pulse-lab.in/#organization" },
      "inLanguage": "en"
    }
  ]
};

const PROTOCOLS = [
  {
    id: 'reaction-test',
    title: 'Visual Reaction',
    description: 'Measures simple visual reaction time with high-resolution frame-aligned timestamps and display latency offset calibration.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/visual-reaction.png'
  },
  {
    id: 'direction-test',
    title: 'Directional Choice',
    description: 'Evaluates choice reaction time and directional discrimination under rapid stimulus presentation.',
    metric: 'Choice Speed (ms)',
    logo: '/brand/assessments/directional-choice.png'
  },
  {
    id: 'colour-recognition',
    title: 'Colour Recognition',
    description: 'Tests selective attention, cognitive flexibility, and conflict processing using chromatic stimulus tasks.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/colour-recognition.png'
  },
  {
    id: 'block-memory',
    title: 'Block Memory',
    description: 'Assesses visuospatial working memory sequence capacity using calibrated sequential block intervals.',
    metric: 'Spatial Span',
    logo: '/brand/assessments/block-memory.png'
  },
  {
    id: 'number-memory',
    title: 'Number Memory',
    description: 'Benchmarks short-term phonological and working memory capacity with incrementally expanding digit sequences.',
    metric: 'Digit Span',
    logo: '/brand/assessments/number-memory.png'
  }
];

export function About({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return (
    <PageShell
      currentView="about"
      onNavigate={onNavigate}
      schema={ABOUT_SCHEMA}
      decorativeWaves="side"
      maxWidth="5xl"
      contentClassName="py-10 sm:py-14 flex flex-col gap-12"
    >
      <div className="w-full flex flex-col gap-12">
        {/* Header / Intro */}
        <header className="border-b border-slate-200/80 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[#BFDBFE] dark:border-[#22C7D6]/40 bg-[#E0F2FE] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] text-xs font-mono mb-4 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6]" />
            <span>PULSE {APP_VERSION} &bull; Scientific Benchmarking</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#090D1A] dark:text-white mb-4">
            About Pulse Evaluator
          </h1>
          <p className="text-[#334155] dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl">
            PULSE (Precision User Latency &amp; Stimulus Evaluator) is a browser-based cognitive benchmarking suite designed to measure human sensory reaction time, choice processing, and working memory with millisecond-resolution timing.
          </p>
        </header>

        {/* Section 1: Platform Purpose & Architecture */}
        <section aria-labelledby="platform-overview" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="platform-overview" className="font-heading text-xl sm:text-2xl font-bold text-[#090D1A] dark:text-white">
              What the Platform Does
            </h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed shadow-xs">
            <p>
              Traditional browser tests suffer from hardware poll variance, variable display refresh timings, and operating system scheduling jitter. PULSE bridges this gap by combining monotonic high-resolution timestamps (<code className="text-xs bg-slate-100 dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">performance.now()</code>), display refresh rate calibration, and frame-aligned stimulus rendering.
            </p>
            <p>
              The platform provides researchers and individuals with standardized, reproducible measurements directly through modern web browsers without requiring local software installation or specialized input devices.
            </p>
          </div>
        </section>

        {/* Section 2: Available Assessments */}
        <section aria-labelledby="available-tests" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="available-tests" className="font-heading text-xl sm:text-2xl font-bold text-[#090D1A] dark:text-white">
              Available Cognitive Assessments
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROTOCOLS.map((proto) => {
              return (
                <div 
                  key={proto.id}
                  className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-[#0066FF]/40 dark:hover:border-[#22C7D6]/40 hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F7FF] dark:bg-[#181D23] border border-[#BFDBFE] dark:border-slate-700 flex items-center justify-center p-1.5">
                        <img src={proto.logo} alt={proto.title} className="w-7 h-7 object-contain" />
                      </div>
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                        {proto.metric}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-base text-[#090D1A] dark:text-white mb-1 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] transition-colors">
                      {proto.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed mb-4">
                      {proto.description}
                    </p>
                  </div>
                  <Link
                    to={`/${proto.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0066FF] dark:text-[#22C7D6] hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 w-fit"
                  >
                    <span>Launch {proto.title} Test</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Intended Audience & How Users Participate */}
        <section aria-labelledby="audience-participation" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="audience-participation" className="font-heading text-xl sm:text-2xl font-bold text-[#090D1A] dark:text-white">
              Who the Platform is For &amp; How to Participate
            </h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed shadow-xs">
            <p>
              PULSE is built for individual participants tracking their personal sensory reaction baseline, cognitive researchers seeking standardized open data, and students studying human sensory-motor factors.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#181D23] border border-slate-200/70 dark:border-slate-800">
                <div className="font-mono text-xs font-semibold text-[#0066FF] dark:text-[#22C7D6] mb-1">1. Select Battery</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose any of the 5 standardized assessment batteries from the assessments hub.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#181D23] border border-slate-200/70 dark:border-slate-800">
                <div className="font-mono text-xs font-semibold text-[#0066FF] dark:text-[#22C7D6] mb-1">2. Complete Trials</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Respond to controlled stimuli using keyboard or pointer inputs under calibrated intervals.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#181D23] border border-slate-200/70 dark:border-slate-800">
                <div className="font-mono text-xs font-semibold text-[#0066FF] dark:text-[#22C7D6] mb-1">3. Review Metrics</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">View high-resolution latency distributions, consistency metrics, and voluntary cohort rankings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Data & Privacy Integrity */}
        <section aria-labelledby="privacy-standards" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="privacy-standards" className="font-heading text-xl sm:text-2xl font-bold text-[#090D1A] dark:text-white">
              Data &amp; Privacy Handling
            </h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed shadow-xs">
            <p>
              Participant privacy and data minimization are central to PULSE:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li><strong className="text-[#090D1A] dark:text-white">Zero PII:</strong> No personal identities, email addresses, phone numbers, or account registrations are required or collected.</li>
              <li><strong className="text-[#090D1A] dark:text-white">Anonymous Telemetry:</strong> Cloud research observations are saved under ephemeral, decoupled tokens with coarsened cohort timeframes (<code className="text-xs bg-slate-100 dark:bg-slate-800 text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">YYYY-MM</code>).</li>
              <li><strong className="text-[#090D1A] dark:text-white">Voluntary Leaderboard:</strong> Submissions to the cohort leaderboard require explicit opt-in and use user-chosen aliases only.</li>
            </ul>
            <div className="pt-2">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 text-xs font-mono font-medium text-[#0066FF] dark:text-[#22C7D6] hover:underline"
              >
                <span>Read Full Research Ethics &amp; Privacy Policy</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 5: Methodology & Scientific Inquiries */}
        <section aria-labelledby="contact-inquiries" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="contact-inquiries" className="font-heading text-xl sm:text-2xl font-bold text-[#090D1A] dark:text-white">
              Methodology &amp; Scientific Inquiries
            </h2>
          </div>
          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[#334155] dark:text-slate-300 shadow-xs">
            <div>
              <p className="font-medium text-[#090D1A] dark:text-white mb-1">
                Methodology &amp; Data Information
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                For methodology, data handling, and privacy information, review the Research Ethics &amp; Privacy Policy.
              </p>
            </div>
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#181D23] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0066FF] dark:hover:border-[#22C7D6] text-xs font-mono text-[#090D1A] dark:text-white inline-flex items-center gap-2 shrink-0 transition-colors"
            >
              <span>Research Ethics &amp; Privacy</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
