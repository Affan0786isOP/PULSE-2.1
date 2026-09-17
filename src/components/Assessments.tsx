import React from 'react';
import { motion } from 'motion/react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';

export function Assessments({ onNavigate }: { onNavigate: (view: string) => void }) {
  const assessments = [
    {
      id: 'reaction-test',
      title: 'Visual Reaction',
      description: 'Wait for the panel to turn white, then click or press Spacebar as fast as you can. Do not click early!',
      type: 'LATENCY',
      status: 'AVAILABLE'
    },
    {
      id: 'direction-test',
      title: 'Direction',
      description: 'Watch for the directional arrow or text cue, then immediately press the matching arrow key or button.',
      type: 'COORDINATION',
      status: 'AVAILABLE'
    },
    {
      id: 'colour-recognition',
      title: 'Colour Recognition',
      description: 'Follow the prompt (MATCH THE WORD or MATCH THE COLOR) and tap the correct button despite mismatched colors.',
      type: 'COGNITIVE',
      status: 'AVAILABLE'
    },
    {
      id: 'block-memory',
      title: 'Block Memory',
      description: 'Watch the sequence of blocks light up on the grid, then tap them in the exact same order.',
      type: 'MEMORY',
      status: 'AVAILABLE'
    },
    {
      id: 'number-memory',
      title: 'Number Memory',
      description: 'Memorize the number shown on screen, then type the digits in order. Each round adds one more digit.',
      type: 'MEMORY',
      status: 'AVAILABLE'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } }
  };

  return (
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans relative">
      <SEO 
        title="Cognitive & Latency Assessments | PULSE"
        description="Explore and start browser-based assessment protocols including reaction time, directional choice speed (CRT), color recognition, block recall, and number memory."
      />
      <Navbar 
        currentView="assessments" 
        onNavigate={onNavigate} 
      />
      
      <main 
        className="flex-1 flex flex-col items-center p-6 md:p-12 bg-transparent relative overflow-y-auto pb-safe px-safe"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="w-full max-w-5xl z-10 flex flex-col">
          <div className="mb-8 text-center md:text-left">
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
              Cognitive Assessments
            </h2>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl leading-relaxed">
              Standardized assessment protocols for neural latency, decision latency, and memory recall.
            </p>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {assessments.map((assessment) => (
              <motion.button 
                key={assessment.id}
                type="button"
                disabled={assessment.status !== 'AVAILABLE'}
                variants={itemVariants}
                whileHover={assessment.status === 'AVAILABLE' ? { y: -3, transition: { duration: 0.15 } } : undefined}
                whileTap={assessment.status === 'AVAILABLE' ? { scale: 0.98 } : undefined}
                onClick={() => assessment.status === 'AVAILABLE' && onNavigate(assessment.id)}
                className={`relative p-5 border rounded-md flex flex-col h-56 transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  assessment.status === 'AVAILABLE' 
                    ? 'bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.99] border-[var(--border-subtle)] hover:border-[var(--border-default)] cursor-pointer group shadow-sm' 
                    : 'bg-[var(--surface-1)] border-[var(--border-subtle)] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    {assessment.type}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--accent)]">
                    {assessment.status.toLowerCase()}
                  </span>
                </div>
                
                <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {assessment.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                  {assessment.description}
                </p>
                
                {assessment.status === 'AVAILABLE' && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    <span>Start assessment</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </main>
      
      <footer className="h-10 border-t border-[var(--border-subtle)] flex items-center justify-between px-6 sm:px-10 shrink-0 bg-[var(--surface-0)] z-20">
        <div className="flex gap-4 md:gap-8 overflow-hidden">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Available tests: {assessments.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
