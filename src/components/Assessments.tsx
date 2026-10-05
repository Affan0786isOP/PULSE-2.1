import React from 'react';
import { motion } from 'motion/react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SEO } from './SEO';
import { Zap, Compass, Palette, Grid, Hash, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export function Assessments({ onNavigate }: { onNavigate: (view: string) => void }) {
  const assessments = [
    {
      id: 'reaction-test',
      protocolNumber: 'TEST 01',
      title: 'Visual Reaction',
      description: 'Wait for the visual signal, then respond as quickly as possible. Measures basic reaction time.',
      type: 'REACTION TIME',
      status: 'AVAILABLE',
      logo: '/brand/assessments/reaction.png',
      badge: 'Latency'
    },
    {
      id: 'direction-test',
      protocolNumber: 'TEST 02',
      title: 'Directional Choice',
      description: 'Press the arrow key that matches the direction on screen. Measures how fast you process and react to new information.',
      type: 'CHOICE SPEED',
      status: 'AVAILABLE',
      logo: '/brand/assessments/direction.png',
      badge: 'Choice Reaction'
    },
    {
      id: 'colour-recognition',
      protocolNumber: 'TEST 03',
      title: 'Colour Recognition',
      description: 'Identify the color of the text when the word and its color do not match. Tests attention and cognitive flexibility.',
      type: 'ATTENTION',
      status: 'AVAILABLE',
      logo: '/brand/assessments/color.png',
      badge: 'Stroop Effect'
    },
    {
      id: 'block-memory',
      protocolNumber: 'TEST 04',
      title: 'Block Memory',
      description: 'Remember and repeat increasingly long sequences of highlighted blocks. Tests spatial memory.',
      type: 'SPATIAL MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/block.png',
      badge: 'Corsi Blocks'
    },
    {
      id: 'number-memory',
      protocolNumber: 'TEST 05',
      title: 'Number Memory',
      description: 'Remember increasingly long sequences of numbers. Tests short-term working memory.',
      type: 'WORKING MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/number.png',
      badge: 'Digit Span'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans relative selection:bg-[var(--accent-subtle)]">
      <SEO 
        title="Assessments | PULSE"
        description="Browser-based tests measuring reaction time, directional choice speed, color recognition, block recall, and number memory."
      />
      <Navbar 
        currentView="assessments" 
        onNavigate={onNavigate} 
      />
      
      <main 
        className="flex-1 flex flex-col items-center p-6 sm:p-10 md:p-12 relative overflow-y-auto pb-safe px-safe"
        style={{
          paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="w-full max-w-6xl z-10 flex flex-col">
          {/* Section Header */}
          <header className="mb-8 md:mb-10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-xs text-[var(--accent)] tracking-widest uppercase font-medium">
                TEST BATTERY
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
              Assessments
            </h1>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl leading-relaxed">
              Five tasks measuring reaction time, attention, and memory.
            </p>
          </header>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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
                className={`relative rounded-2xl flex flex-col text-left overflow-hidden w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] transition-all ${
                  assessment.status === 'AVAILABLE' 
                    ? 'bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-lg cursor-pointer group' 
                    : 'bg-[var(--surface-1)] border border-[var(--border-subtle)] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="relative w-full h-44 bg-[var(--surface-0)] border-b border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: 'var(--bg-grid-pattern)',
                      backgroundSize: '48px 48px'
                    }}
                  />
                  <img 
                    src={assessment.logo} 
                    alt={assessment.title}
                    className="w-20 h-20 object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3.5 right-3.5 z-20">
                     <span className="font-mono text-[10px] text-[var(--text-primary)] bg-[var(--surface-1)]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-[var(--border-subtle)] uppercase tracking-wider font-medium">
                       {assessment.badge}
                     </span>
                  </div>
                  <div className="absolute bottom-3 left-4 z-20">
                    <span className="font-mono text-[11px] text-[var(--accent)] font-semibold tracking-wider">
                      {assessment.protocolNumber}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <div className="text-[10px] font-mono font-medium text-[var(--text-muted)] tracking-wider uppercase mb-1.5">
                    {assessment.type}
                  </div>
                  
                  <h2 className="font-heading text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                    {assessment.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1 mb-4">
                    {assessment.description}
                  </p>
                  
                  {assessment.status === 'AVAILABLE' && (
                    <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                      <span className="tracking-wide">Start test</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
