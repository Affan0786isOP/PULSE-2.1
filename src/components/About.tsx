import React from 'react';
import { motion } from 'motion/react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SEO } from './SEO';
import { 
  Zap, 
  Compass, 
  Palette, 
  Grid, 
  Hash, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileText, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../lib/version';

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
    icon: Zap,
    metric: 'Latency (ms)'
  },
  {
    id: 'direction-test',
    title: 'Directional Choice',
    description: 'Evaluates choice reaction time and directional discrimination under rapid stimulus presentation.',
    icon: Compass,
    metric: 'Choice Speed (ms)'
  },
  {
    id: 'colour-recognition',
    title: 'Colour Recognition',
    description: 'Tests selective attention, cognitive flexibility, and conflict processing using chromatic stimulus tasks.',
    icon: Palette,
    metric: 'Latency (ms)'
  },
  {
    id: 'block-memory',
    title: 'Block Memory',
    description: 'Assesses visuospatial working memory sequence capacity using calibrated sequential block intervals.',
    icon: Grid,
    metric: 'Spatial Span'
  },
  {
    id: 'number-memory',
    title: 'Number Memory',
    description: 'Benchmarks short-term phonological and working memory capacity with incrementally expanding digit sequences.',
    icon: Hash,
    metric: 'Digit Span'
  }
];

export function About({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans relative selection:bg-[var(--accent-subtle)]">
      <SEO 
        title="About PULSE — Cognitive Benchmarking Suite"
        description="Learn about PULSE (Precision User Latency & Stimulus Evaluator), our standardized browser-based cognitive tests, telemetry engine, and privacy standards."
        schema={ABOUT_SCHEMA}
      />

      <Navbar currentView="about" onNavigate={onNavigate} />

      <main 
        id="main-content"
        className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-12"
      >
        {/* Header / Intro */}
        <header className="border-b border-[var(--border-subtle)] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--accent)] text-xs font-mono mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>PULSE {APP_VERSION} &bull; Open Scientific Benchmarking</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
            About Pulse Evaluator
          </h1>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-3xl">
            PULSE (Precision User Latency &amp; Stimulus Evaluator) is an open-source, browser-based cognitive benchmarking suite designed to measure human sensory reaction time, choice processing, and working memory with millisecond precision.
          </p>
        </header>

        {/* Section 1: Platform Purpose & Architecture */}
        <section aria-labelledby="platform-overview" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--accent)]" />
            <h2 id="platform-overview" className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              What the Platform Does
            </h2>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <p>
              Traditional browser tests suffer from hardware poll variance, variable display refresh timings, and operating system scheduling jitter. PULSE bridges this gap by combining monotonic high-resolution timestamps (<code className="text-xs bg-[var(--surface-2)] text-[var(--accent)] px-1.5 py-0.5 rounded font-mono">performance.now()</code>), display refresh rate calibration, and frame-aligned stimulus rendering.
            </p>
            <p>
              The platform provides researchers and individuals with standardized, reproducible measurements directly through modern web browsers without requiring local software installation or specialized input devices.
            </p>
          </div>
        </section>

        {/* Section 2: Available Assessments */}
        <section aria-labelledby="available-tests" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[var(--accent)]" />
            <h2 id="available-tests" className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Available Cognitive Assessments
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROTOCOLS.map((proto) => {
              const Icon = proto.icon;
              return (
                <div 
                  key={proto.id}
                  className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col justify-between hover:border-[var(--border-default)] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                        <Icon size={16} />
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                        {proto.metric}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-base text-[var(--text-primary)] mb-1">
                      {proto.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                      {proto.description}
                    </p>
                  </div>
                  <Link
                    to={`/${proto.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline pt-2 border-t border-[var(--border-subtle)] w-fit"
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
            <Users size={18} className="text-[var(--accent)]" />
            <h2 id="audience-participation" className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Who the Platform is For &amp; How to Participate
            </h2>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <p>
              PULSE is built for individual participants tracking their personal sensory reaction baseline, cognitive researchers seeking standardized open data, and students studying human sensory-motor factors.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <div className="font-mono text-xs font-semibold text-[var(--accent)] mb-1">1. Select Battery</div>
                <p className="text-xs text-[var(--text-muted)]">Choose any of the 5 standardized assessment batteries from the assessments hub.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <div className="font-mono text-xs font-semibold text-[var(--accent)] mb-1">2. Complete Trials</div>
                <p className="text-xs text-[var(--text-muted)]">Respond to controlled stimuli using keyboard or pointer inputs under calibrated intervals.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <div className="font-mono text-xs font-semibold text-[var(--accent)] mb-1">3. Review Metrics</div>
                <p className="text-xs text-[var(--text-muted)]">View high-resolution latency distributions, consistency metrics, and voluntary cohort rankings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Data & Privacy Integrity */}
        <section aria-labelledby="privacy-standards" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--accent)]" />
            <h2 id="privacy-standards" className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Data &amp; Privacy Handling
            </h2>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <p>
              Participant privacy and data minimization are central to PULSE:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li><strong className="text-[var(--text-primary)]">Zero PII:</strong> No personal identities, email addresses, phone numbers, or account registrations are required or collected.</li>
              <li><strong className="text-[var(--text-primary)]">Anonymous Telemetry:</strong> Cloud research observations are saved under ephemeral, decoupled tokens with coarsened cohort timeframes (<code className="text-xs bg-[var(--surface-2)] px-1 py-0.5 rounded font-mono">YYYY-MM</code>).</li>
              <li><strong className="text-[var(--text-primary)]">Voluntary Leaderboard:</strong> Submissions to the cohort leaderboard require explicit opt-in and use user-chosen aliases only.</li>
            </ul>
            <div className="pt-2">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 text-xs font-mono font-medium text-[var(--accent)] hover:underline"
              >
                <span>Read Full Research Ethics &amp; Privacy Policy</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 5: Contact & Open Source */}
        <section aria-labelledby="contact-inquiries" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--accent)]" />
            <h2 id="contact-inquiries" className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Contact &amp; Scientific Inquiries
            </h2>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
            <div>
              <p className="font-medium text-[var(--text-primary)] mb-1">
                Open-Source Project Repository &amp; Issue Tracker
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                For questions regarding data ethics, issue reports, or methodological feedback, open an inquiry on GitHub.
              </p>
            </div>
            <a
              href="https://github.com/Affan0786isOP/PULSE-2.1/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-xs font-mono text-[var(--text-primary)] inline-flex items-center gap-2 shrink-0 transition-colors"
            >
              <span>GitHub Issues</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default About;
