import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { PageShell } from './layout/PageShell';

export function Assessments({ onNavigate }: { onNavigate: (view: string) => void }) {
  const assessments = [
    {
      id: 'reaction-test',
      protocolNumber: 'TEST 01',
      title: 'Visual Reaction',
      description: 'Wait for the visual signal, then respond as quickly as possible. Measures basic reaction time.',
      type: 'REACTION TIME',
      status: 'AVAILABLE',
      logo: '/brand/assessments/visual-reaction.png',
      badge: 'Latency'
    },
    {
      id: 'direction-test',
      protocolNumber: 'TEST 02',
      title: 'Directional Choice',
      description: 'Press the arrow key that matches the direction on screen. Measures how fast you process and react to new information.',
      type: 'CHOICE SPEED',
      status: 'AVAILABLE',
      logo: '/brand/assessments/directional-choice.png',
      badge: 'Choice Reaction'
    },
    {
      id: 'colour-recognition',
      protocolNumber: 'TEST 03',
      title: 'Colour Recognition',
      description: 'Identify the color of the text when the word and its color do not match. Tests attention and cognitive flexibility.',
      type: 'ATTENTION',
      status: 'AVAILABLE',
      logo: '/brand/assessments/colour-recognition.png',
      badge: 'Stroop Effect'
    },
    {
      id: 'block-memory',
      protocolNumber: 'TEST 04',
      title: 'Block Memory',
      description: 'Remember and repeat increasingly long sequences of highlighted blocks. Tests spatial memory.',
      type: 'SPATIAL MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/block-memory.png',
      badge: 'Corsi Blocks'
    },
    {
      id: 'number-memory',
      protocolNumber: 'TEST 05',
      title: 'Number Memory',
      description: 'Remember increasingly long sequences of numbers. Tests short-term working memory.',
      type: 'WORKING MEMORY',
      status: 'AVAILABLE',
      logo: '/brand/assessments/number-memory.png',
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
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }
  };

  return (
    <PageShell
      currentView="assessments"
      onNavigate={onNavigate}
      decorativeWaves="side"
      maxWidth="6xl"
      contentClassName="p-4 sm:p-8 md:p-10"
    >
      <div className="w-full flex flex-col">
        {/* Section Header */}
        <header className="mb-8 md:mb-10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0066FF] dark:bg-[#22C7D6]" />
            <span className="font-mono text-xs text-[#0066FF] dark:text-[#22C7D6] tracking-widest uppercase font-semibold">
              TEST BATTERY
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#090D1A] dark:text-white">
            Assessments
          </h1>
          <p className="text-[#334155] dark:text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Five tasks measuring reaction time, attention, and memory.
          </p>
        </header>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
              className={`relative rounded-2xl flex flex-col text-left overflow-hidden w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] transition-all ${
                assessment.status === 'AVAILABLE' 
                  ? 'bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-[#0066FF]/40 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer group' 
                  : 'bg-slate-50 border border-slate-200 opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Card Medallion Header */}
              <div className="relative w-full h-44 bg-[#F0F7FF] dark:bg-[#181D23] border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(0, 102, 255, 0.12) 1.2px, transparent 1.2px)',
                    backgroundSize: '24px 24px',
                  }}
                />
                <img 
                  src={assessment.logo} 
                  alt={assessment.title}
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3.5 right-3.5 z-20">
                   <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-[#12161B] backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-wider font-semibold shadow-xs">
                     {assessment.badge}
                   </span>
                </div>
                <div className="absolute bottom-3 left-4 z-20">
                  <span className="font-mono text-[11px] text-[#0066FF] dark:text-[#22C7D6] font-semibold tracking-wider">
                    {assessment.protocolNumber}
                  </span>
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <div className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase mb-1.5">
                  {assessment.type}
                </div>
                
                <h2 className="font-heading text-xl font-bold tracking-tight text-[#090D1A] dark:text-white mb-2 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] transition-colors">
                  {assessment.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed flex-1 mb-5">
                  {assessment.description}
                </p>
                
                {assessment.status === 'AVAILABLE' && (
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#BFDBFE] dark:border-[#22C7D6]/40 bg-white dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] text-xs font-semibold group-hover:bg-[#F0F7FF] dark:group-hover:bg-[#22C7D6]/10 group-hover:border-[#0066FF] dark:group-hover:border-[#22C7D6] transition-colors">
                      <span>Try {assessment.title}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </PageShell>
  );
}
