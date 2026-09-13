import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CountdownOverlayProps {
  count: number;
}

export function CountdownOverlay({ count }: CountdownOverlayProps) {
  // Color transition based on count (3 -> 2 -> 1)
  const getGradient = (num: number) => {
    switch (num) {
      case 3:
        return 'from-yellow-400 to-amber-500';
      case 2:
        return 'from-lime-400 to-green-500';
      case 1:
        return 'from-green-400 to-emerald-600';
      default:
        return 'from-yellow-400 to-amber-500';
    }
  };

  const getShadowColor = (num: number) => {
    switch (num) {
      case 3:
        return 'rgba(251, 191, 36, 0.5)'; // amber-400
      case 2:
        return 'rgba(163, 230, 53, 0.5)'; // lime-400
      case 1:
        return 'rgba(74, 222, 128, 0.5)'; // green-400
      default:
        return 'rgba(251, 191, 36, 0.5)';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-1)]/80 backdrop-blur-md rounded-[inherit] z-[100] overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {/* Background Flash Effect */}
        <motion.div
          key={`flash-${count}`}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 bg-white dark:bg-white/20 mix-blend-overlay pointer-events-none"
        />

        {/* Ambient Glow */}
        <motion.div
          key={`glow-${count}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute w-64 h-64 rounded-full blur-[80px]"
          style={{ backgroundColor: getShadowColor(count) }}
        />

        {/* Number and Text */}
        <motion.div
          key={`number-${count}`}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 20,
            opacity: { duration: 0.2 }
          }}
          className="flex flex-col items-center justify-center z-10"
        >
          <div 
            className={`text-[140px] sm:text-[180px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b ${getGradient(count)}`}
            style={{ filter: `drop-shadow(0 0 40px ${getShadowColor(count)})` }}
          >
            {count}
          </div>
          <div className="text-[var(--text-primary)] font-mono tracking-[10px] uppercase text-2xl mt-4 font-bold drop-shadow-md">
            GET READY
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
