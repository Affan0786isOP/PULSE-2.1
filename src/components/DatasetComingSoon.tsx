import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SEO } from './SEO';

export function DatasetComingSoon() {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)] font-sans flex flex-col selection:bg-[var(--accent-subtle)]">
      <SEO
        title="Dataset Coming Soon | PULSE"
        description="The public PULSE research dataset is being prepared for release."
        noindex
      />

      <Navbar currentView="dataset" />

      <main className="flex-1 w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <section
          aria-labelledby="dataset-coming-soon-title"
          className="w-full max-w-2xl text-center"
        >
          <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
            <Database size={24} aria-hidden="true" />
          </div>

          <p className="text-[11px] font-mono font-semibold text-[var(--accent)] uppercase tracking-[0.22em] mb-3">
            Dataset
          </p>

          <h1
            id="dataset-coming-soon-title"
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]"
          >
            COMING SOON
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto">
            We’re preparing the verified PULSE research dataset for public release. The explorer will open once the dataset reaches the required research and quality standards.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/assessments"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span>Explore Assessments</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
