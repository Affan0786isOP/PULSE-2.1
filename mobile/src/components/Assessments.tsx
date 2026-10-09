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
      description: 'Wait for the visual signal, then respond as quickly as possible. Measures basic reaction time.',
      type: 'REACTION TIME',
      status: 'AVAILABLE',
      logo: '/brand/assessments/visual-reaction.svg'
    },
    {
      id: 'direction-test',
      title: 'Directional Choice',
      description: 'Tap the arrow that matches the direction on screen. Measures how fast you process and react to new information.',
      type: 'CHOICE SPEED',
      status: 'AVAILABLE',
      logo: '/brand/assessments/directional-choice.svg'
    },
    {
      id: 'colour-recognition',
      title: 'Colour Recognition',
      description: 'Identify the color of the text when the word and its color do not match. Tests attention and cognitive flexibility.',
      type: 'ATTENTION',
      status: 'AVAILABLE',
      logo: '/brand/assessments/colour-recognition.svg'
    },
    {
      id: 'block-memory',
      title: 'Block Memory',
      description: 'Remember and repeat increasingly long sequences of highlighted blocks. Tests spatial memory.',
      type: 'SPATIAL MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/block-memory.svg'
    },
    {
      id: 'number-memory',
      title: 'Number Memory',
      description: 'Remember increasingly long sequences of numbers. Tests short-term working memory.',
      type: 'WORKING MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/number-memory.svg'
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans relative selection:bg-[var(--accent-subtle)] pb-20">
      <SEO 
        title="Assessments | PULSE"
        description="Browser-based tests measuring reaction time, directional choice speed, color recognition, block recall, and number memory."
      />
      
      <Navbar currentView="assessments" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-3">
        <header className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="font-mono text-[10px] text-[var(--accent)] tracking-widest uppercase font-semibold">
              TEST BATTERY
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Assessments
          </h1>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">
            Select a benchmark to begin telemetry capture.
          </p>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2.5"
        >
          {assessments.map((assessment, index) => {
            const isAvail = assessment.status === 'AVAILABLE';
            return (
              <motion.button
                key={assessment.id}
                variants={itemVariants}
                disabled={!isAvail}
                whileTap={isAvail ? { scale: 0.98 } : undefined}
                onClick={() => {
                  if (isAvail) {
                    triggerHaptic('tap');
                    onNavigate(assessment.id);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition-all relative overflow-hidden ${
                  isAvail 
                    ? 'bg-[var(--surface-1)] border-[var(--border-subtle)] active:bg-[var(--surface-2)] active:border-[var(--border-default)]' 
                    : 'bg-[var(--surface-1)]/50 border-[var(--border-subtle)]/40 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Protocol Mark Icon */}
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 p-2">
                  <img 
                    src={assessment.logo} 
                    alt={assessment.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-mono text-[9px] text-[var(--accent)] font-semibold tracking-wider">
                      PROTOCOL 0{index + 1}
                    </span>
                    <span className="font-mono text-[8.5px] text-[var(--text-muted)] uppercase tracking-wider">
                      {assessment.type}
                    </span>
                  </div>
                  <h2 className="font-heading text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                    {assessment.title}
                  </h2>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                    {assessment.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
