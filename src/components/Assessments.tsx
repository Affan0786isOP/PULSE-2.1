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
      status: 'AVAILABLE',
      logo: '/brand/assessments/reaction.png'
    },
    {
      id: 'direction-test',
      title: 'Direction',
      description: 'Watch for the directional arrow or text cue, then immediately press the matching arrow key or button.',
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
      logo: '/brand/assessments/color.jpg'
    },
    {
      id: 'block-memory',
      title: 'Block Memory',
      description: 'Watch the sequence of blocks light up on the grid, then tap them in the exact same order.',
      type: 'MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/block.jpg'
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
                className={`relative rounded-xl flex flex-col text-left overflow-hidden w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  assessment.status === 'AVAILABLE' 
                    ? 'pulse-card pulse-card-interactive cursor-pointer group' 
                    : 'bg-[var(--surface-1)] border border-[var(--border-subtle)] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="relative w-full h-40 bg-[#08080A] border-b border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-1)] to-transparent z-10 pointer-events-none" />
                  <img 
                    src={assessment.logo} 
                    alt={assessment.title}
                    className="w-24 h-24 object-contain relative z-0 drop-shadow-[0_0_20px_rgba(0,240,255,0.25)] group-hover:scale-110 group-hover:drop-shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-500 ease-out"
                  />
                  <div className="absolute top-3 right-3 z-20">
                     <span className="pulse-mono-meta text-[var(--accent)] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest text-[10px]">
                       {assessment.status}
                     </span>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1 bg-[var(--surface-1)]/50">
                  <div className="mb-2.5">
                    <span className="pulse-mono-meta px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)] inline-block">
                      {assessment.type}
                    </span>
                  </div>
                  
                  <h3 className="font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-1.5 group-hover:text-[var(--accent)] transition-colors duration-300">
                    {assessment.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                    {assessment.description}
                  </p>
                  
                  {assessment.status === 'AVAILABLE' && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono font-medium text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                      <span>START ASSESSMENT</span>
                      <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </div>
                  )}
                </div>
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
