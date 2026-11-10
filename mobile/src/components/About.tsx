import React from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileText, 
  ChevronRight,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { triggerHaptic } from '../lib/settingsStore';
import { APP_VERSION } from '../../../src/lib/version';
import { motion } from 'motion/react';

interface AboutProps {
  onNavigate?: (view: string) => void;
}

const PROTOCOLS = [
  {
    id: 'reaction-test',
    number: '01',
    title: 'Visual Reaction',
    description: 'Measures simple visual reaction time with high-resolution frame-aligned timestamps and display latency offset calibration.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/visual-reaction.png'
  },
  {
    id: 'direction-test',
    number: '02',
    title: 'Directional Choice',
    description: 'Evaluates choice reaction time and directional discrimination under rapid stimulus presentation.',
    metric: 'Choice Speed (ms)',
    logo: '/brand/assessments/directional-choice.png'
  },
  {
    id: 'colour-recognition',
    number: '03',
    title: 'Colour Recognition',
    description: 'Tests selective attention, cognitive flexibility, and conflict processing using chromatic stimulus tasks.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/colour-recognition.png'
  },
  {
    id: 'block-memory',
    number: '04',
    title: 'Block Memory',
    description: 'Assesses visuospatial working memory sequence capacity using calibrated sequential block intervals.',
    metric: 'Spatial Span',
    logo: '/brand/assessments/block-memory.png'
  },
  {
    id: 'number-memory',
    number: '05',
    title: 'Number Memory',
    description: 'Benchmarks short-term phonological and working memory capacity with incrementally expanding digit sequences.',
    metric: 'Digit Span',
    logo: '/brand/assessments/number-memory.png'
  }
];

export function About({ onNavigate }: AboutProps) {
  const handleLaunchProtocol = (id: string) => {
    triggerHaptic('light');
    if (onNavigate) {
      onNavigate(id);
    }
  };

  const handleNavigateToPrivacy = () => {
    triggerHaptic('light');
    if (onNavigate) {
      onNavigate('/privacy');
    }
  };

  return (
    <div 
      className="bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] dark:from-[#0B0D10] dark:via-[#0B0D10] dark:to-[#0B0D10] text-[#090D1A] dark:text-[#F5F7FA] min-h-[100dvh] w-full flex flex-col font-sans relative selection:bg-[#0066FF]/20"
      style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <SEO 
        title="About Pulse Evaluator | PULSE"
        description="PULSE (Precision User Latency & Stimulus Evaluator) mobile cognitive benchmarking suite measuring reaction time, choice speed, and working memory."
      />

      <Navbar currentView="about" onNavigate={onNavigate || (() => {})} />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-6">
        {/* Header / Intro Hero */}
        <motion.header 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-2 pt-1"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0066FF]/10 dark:bg-[#22C7D6]/10 border border-[#0066FF]/20 dark:border-[#22C7D6]/20 text-[#0066FF] dark:text-[#22C7D6] text-[11px] font-mono font-medium w-fit select-none">
            <Activity size={12} className="animate-pulse" />
            <span>PULSE v{APP_VERSION}</span>
            <span>•</span>
            <span>MOBILE SUITE</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white mt-1">
            About Pulse Evaluator
          </h1>
          <p className="text-[#475569] dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
            Precision User Latency &amp; Stimulus Evaluator (PULSE) is a web-native cognitive benchmarking laboratory designed to measure human sensory latency, decision processing, and memory spans with millisecond precision directly on touch hardware.
          </p>
        </motion.header>

        {/* Section 1: Platform Purpose & Millisecond Engine */}
        <section aria-labelledby="platform-overview" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="platform-overview" className="font-heading text-sm font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
              What The Platform Does
            </h2>
          </div>

          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs">
            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              Standard web apps suffer from touch polling variance, background throttling, and display refresh jitter. PULSE eliminates timing inaccuracies by integrating monotonic high-resolution timestamps (<code className="text-[11px] bg-slate-100 dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">performance.now()</code>), display refresh rate synchronization, and zero-overhead frame pacing.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6]">±1ms</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Monotonic Clock</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6]">120/60Hz</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Frame Paced</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6]">Zero</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Install Needed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: 5 Cognitive Assessment Batteries */}
        <section aria-labelledby="available-tests" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#0066FF] dark:text-[#22C7D6]" />
              <h2 id="available-tests" className="font-heading text-sm font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
                Available Assessments
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">5 Protocols</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {PROTOCOLS.map((proto) => (
              <button
                key={proto.id}
                type="button"
                onClick={() => handleLaunchProtocol(proto.id)}
                className="w-full text-left bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 active:scale-[0.98] active:bg-slate-50 dark:active:bg-[#181D23] transition-all select-none touch-manipulation group shadow-xs"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#F0F7FF] dark:bg-[#181D23] border border-[#BFDBFE] dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 mt-0.5">
                    <img src={proto.logo} alt={proto.title} className="w-7 h-7 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] font-semibold text-[#0066FF] dark:text-[#22C7D6] tracking-wider">
                        PROTOCOL {proto.number}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">•</span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {proto.metric}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-[#090D1A] dark:text-white group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] transition-colors truncate">
                      {proto.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {proto.description}
                    </p>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#181D23] flex items-center justify-center text-slate-400 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] shrink-0 transition-colors">
                  <ChevronRight size={15} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Intended Audience & Participation Workflow */}
        <section aria-labelledby="audience-workflow" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="audience-workflow" className="font-heading text-sm font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
              How To Participate
            </h2>
          </div>

          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              PULSE is accessible to everyone — from individual participants tracking their daily cognitive stamina to researchers studying sensory motor baselines.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6] bg-[#0066FF]/10 dark:bg-[#22C7D6]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <div className="font-heading font-semibold text-xs text-[#090D1A] dark:text-white">Select Battery</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    Pick any of the 5 calibrated protocols from the Assessments hub.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6] bg-[#0066FF]/10 dark:bg-[#22C7D6]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <div className="font-heading font-semibold text-xs text-[#090D1A] dark:text-white">Complete Trials</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    Respond to randomized visual stimuli using low-latency touch gestures.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181D23]/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6] bg-[#0066FF]/10 dark:bg-[#22C7D6]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <div className="font-heading font-semibold text-xs text-[#090D1A] dark:text-white">Inspect Telemetry</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    Review reaction distributions, consistency metrics, and voluntary cohort rankings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Data & Privacy Integrity */}
        <section aria-labelledby="privacy-standards" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="privacy-standards" className="font-heading text-sm font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
              Data &amp; Privacy Integrity
            </h2>
          </div>

          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              Participant privacy and data minimization are built into the core architecture:
            </p>

            <ul className="space-y-2 text-xs text-[#334155] dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] mt-1.5 shrink-0" />
                <span>
                  <strong className="text-[#090D1A] dark:text-white">Zero PII:</strong> No email, real name, or persistent account credentials are required or stored.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] mt-1.5 shrink-0" />
                <span>
                  <strong className="text-[#090D1A] dark:text-white">Anonymous Telemetry:</strong> Public research dataset observations use decoupled tokens with coarsened cohort timeframes (<code className="text-[10px] bg-slate-100 dark:bg-slate-800 text-[#0066FF] dark:text-[#22C7D6] px-1 py-0.5 rounded font-mono">YYYY-MM</code>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] mt-1.5 shrink-0" />
                <span>
                  <strong className="text-[#090D1A] dark:text-white">Voluntary Leaderboard:</strong> Submissions require explicit opt-in using self-chosen display aliases.
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={handleNavigateToPrivacy}
              className="mt-1 w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#181D23] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0066FF] dark:text-[#22C7D6] inline-flex items-center justify-between active:scale-[0.98] transition-all touch-manipulation select-none"
            >
              <span>Read Research Ethics &amp; Privacy Policy</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* Section 5: Methodology & Scientific Inquiries */}
        <section aria-labelledby="methodology-inquiries" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#0066FF] dark:text-[#22C7D6]" />
            <h2 id="methodology-inquiries" className="font-heading text-sm font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
              Scientific Methodology
            </h2>
          </div>

          <div className="bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              PULSE data is formatted for open scientific analysis and reproducible latency research. For technical details on telemetry schemas, timing offsets, and dataset access:
            </div>

            <button
              type="button"
              onClick={handleNavigateToPrivacy}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100/80 dark:bg-[#181D23] hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-[#090D1A] dark:text-white inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all touch-manipulation select-none"
            >
              <span>Methodology &amp; Ethics Standards</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default About;
