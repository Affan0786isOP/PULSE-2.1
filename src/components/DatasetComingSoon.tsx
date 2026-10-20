import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from './layout/PageShell';

export function DatasetComingSoon() {
  return (
    <PageShell
      currentView="dataset"
      decorativeWaves="bottom"
      noindex={true}
      maxWidth="2xl"
      contentClassName="items-center justify-center py-12 sm:py-16"
    >
      <section
        aria-labelledby="dataset-coming-soon-title"
        className="w-full text-center bg-white/90 dark:bg-[#12161B] backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-xs"
      >
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-[#E0F2FE] dark:bg-[#181D23] border border-[#BFDBFE] dark:border-[#22C7D6]/40 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6]">
          <Database size={24} aria-hidden="true" />
        </div>

        <p className="text-[11px] font-mono font-semibold text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-[0.22em] mb-3">
          Dataset
        </p>

        <h1
          id="dataset-coming-soon-title"
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#090D1A] dark:text-white"
        >
          PUBLIC RESEARCH DATASET — COMING SOON
        </h1>

        <p className="mt-5 text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
          We’re preparing the verified PULSE research dataset for public release. The explorer will open once the dataset reaches the required research and quality standards.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            to="/assessments"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          >
            <span>Explore Assessments</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
