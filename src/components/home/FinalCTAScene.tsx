import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, ArrowRight, Compass } from 'lucide-react';
import { getAssessmentLaunchRoute } from '@shared/registries/routeRegistry';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function FinalCTAScene() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const primaryLaunchRoute = getAssessmentLaunchRoute('visual-reaction');

  return (
    <section 
      id="cta" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Launch Assessment Call to Action"
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.div 
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-6 shadow-sm"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ INITIATE // EVALUATION RUN ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-6 text-balance"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
        >
          Ready to see how you perform?
        </motion.h2>

        <motion.p 
          className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-6 leading-relaxed text-pretty font-normal"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
        >
          Free to try. No account required.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.18 }}
        >
          <button
            type="button"
            onClick={() => navigate(primaryLaunchRoute)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white font-semibold text-sm shadow-[0_10px_25px_-5px_rgba(0,102,255,0.4)] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>Start an assessment</span>
          </button>

          <Link
            to="/assessments"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-[#181D23] hover:bg-slate-50 dark:hover:bg-[#20262E] text-[#090D1A] dark:text-white font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
          >
            <Compass size={16} />
            <span>Explore all assessments</span>
            <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
