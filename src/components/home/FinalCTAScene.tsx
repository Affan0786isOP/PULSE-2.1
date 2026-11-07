import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useGuardedNavigate } from '@shared/navigation/useGuardedNavigate';
import { Play, ArrowRight, Compass } from 'lucide-react';
import { getAssessmentLaunchRoute } from '@shared/registries/routeRegistry';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function FinalCTAScene() {
  const navigate = useGuardedNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const primaryLaunchRoute = getAssessmentLaunchRoute('visual-reaction');

  return (
    <section 
      id="cta" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Launch Assessment Call to Action"
    >
      <motion.div 
        className="max-w-4xl mx-auto text-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-6 text-balance">
          Ready to see how you perform?
        </h2>

        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-6 leading-relaxed text-pretty font-normal">
          Free to try. No account required.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
        </div>
      </motion.div>
    </section>
  );
}
