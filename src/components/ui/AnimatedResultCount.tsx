import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface AnimatedResultCountProps {
  value: number | null;
  isLoading: boolean;
  className?: string;
  loadingClassName?: string;
}

export function AnimatedResultCount({
  value,
  isLoading,
  className = '',
  loadingClassName = 'inline-block w-8 h-5 bg-sky-200/50 animate-pulse motion-reduce:animate-none rounded my-0.5',
}: AnimatedResultCountProps) {
  const shouldReduceMotion = useReducedMotionPreference();
  const prevValueRef = useRef<number | null>(value);
  const [hasUpdated, setHasUpdated] = useState(false);

  useEffect(() => {
    if (value !== null && prevValueRef.current !== null && value !== prevValueRef.current) {
      setHasUpdated(true);
      const timer = setTimeout(() => {
        setHasUpdated(false);
      }, 700);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  if (isLoading && value === null) {
    return <span role="status" aria-label="Loading result count" className={loadingClassName} />;
  }

  if (value === null) {
    return <span className={className}>—</span>;
  }

  const formatted = value >= 1000 ? `${Math.floor(value / 1000)}K+` : String(value);

  if (shouldReduceMotion) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <span className={`inline-flex items-center justify-center relative ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={formatted}
          initial={{ y: -8, opacity: 0.2, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: hasUpdated ? [1, 1.14, 1] : 1,
            color: hasUpdated ? ['#090D1A', '#0066FF', '#090D1A'] : '#090D1A',
          }}
          exit={{ y: 8, opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block"
        >
          {formatted}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
