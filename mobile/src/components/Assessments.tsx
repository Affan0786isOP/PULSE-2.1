import React from 'react';
import { motion } from 'motion/react';
import { Navbar } from './Navbar';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';

export function Assessments({ onNavigate }: { onNavigate: (view: string) => void }) {
  const assessments = [
    {
      id: 'reaction-test',
      title: 'Visual Reaction',
      description: 'Wait for the panel to turn white, then tap as fast as you can. Do not tap early!',
      type: 'LATENCY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/reaction.png'
    },
    {
      id: 'direction-test',
      title: 'Direction',
      description: 'Watch for the directional arrow or cue, then immediately tap the matching direction button.',
      type: 'COORDINATION',
      status: 'AVAILABLE',
      logo: '/brand/assessments/direction.png'
    },
    {
      id: 'colour-recognition',
      title: 'Colour Recognition',
      description: 'Follow the prompt (MATCH THE WORD or MATCH THE COLOR) and tap the correct button despite mismatched colors.',
      type: 'COGNITIVE',
      status: 'AVAILABLE',
      logo: '/brand/assessments/color.png'
    },
    {
      id: 'block-memory',
      title: 'Block Memory',
      description: 'Watch the sequence of blocks light up on the grid, then tap them in the exact same order.',
      type: 'MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/block.png'
    },
    {
      id: 'number-memory',
      title: 'Number Memory',
      description: 'Memorize the number shown on screen, then type the digits in order. Each round adds one more digit.',
      type: 'MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/number.png'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans">
      <SEO 
        title="Cognitive & Latency Assessments | PULSE Mobile"
        description="Benchmark reaction times, color recognition, directional choices, and working memory from your mobile browser."
      />
      <Navbar 
        currentView="assessments" 
        onNavigate={onNavigate} 
        title="Assessments"
      />
      
      <main 
        className="flex-1 flex flex-col items-center p-4 bg-transparent relative overflow-y-auto pb-safe px-safe"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="w-full max-w-sm z-10 flex flex-col pb-8">
          <div className="mb-4 pt-1">
            <p className="text-[var(--text-secondary)] text-xs">
              Select an assessment protocol to evaluate cognitive speed and accuracy.
            </p>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3"
          >
            {assessments.map((assessment) => (
              <motion.button 
                key={assessment.id}
                type="button"
                disabled={assessment.status !== 'AVAILABLE'}
                variants={itemVariants}
                whileTap={assessment.status === 'AVAILABLE' ? { scale: 0.98 } : undefined}
                onClick={() => {
                  if (assessment.status === 'AVAILABLE') {
                    triggerHaptic('tap');
                    onNavigate(assessment.id);
                  }
                }}
                className={`border rounded-xl flex flex-col text-left w-full overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  assessment.status === 'AVAILABLE' 
                    ? 'bg-[var(--surface-1)] border-[var(--border-subtle)] hover:border-[var(--border-default)] cursor-pointer shadow-sm active:scale-[0.99] group' 
                    : 'bg-[var(--surface-1)] border-[var(--border-subtle)] opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="relative w-full h-32 bg-[#08080A] border-b border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-1)] to-transparent z-10 pointer-events-none" />
                  <img 
                    src={assessment.logo} 
                    alt={assessment.title}
                    className="w-20 h-20 object-contain relative z-0 drop-shadow-[0_0_15px_rgba(0,240,255,0.25)] group-active:scale-110 transition-transform duration-300 ease-out"
                  />
                  <div className="absolute top-3 right-3 z-20">
                     <span className="text-[10px] font-mono text-[var(--accent)] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                       {assessment.status}
                     </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 bg-[var(--surface-1)]/50">
                  <div className="mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)] inline-block">
                      {assessment.type}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 font-heading group-active:text-[var(--accent)] transition-colors">{assessment.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{assessment.description}</p>
                  
                  {assessment.status === 'AVAILABLE' && (
                    <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-active:text-[var(--accent)] transition-colors">
                      <span>Start assessment</span>
                      <span className="group-active:translate-x-1 transition-transform">→</span>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="h-10 border-t border-[var(--border-subtle)] flex items-center justify-between px-4 shrink-0 bg-[var(--surface-0)]">
        <div className="flex gap-4 overflow-hidden">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Available: {assessments.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
