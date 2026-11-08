import React from 'react';
import { useGuardedNavigate } from '@shared/navigation/useGuardedNavigate';
import guidesData from '../../../shared/content/guides.json';
import type { GuideDocument } from '../../../shared/content/guideValidator.d.mts';
import { BookOpen, ArrowRight, BarChart3, Clock, Compass } from 'lucide-react';

interface GuidesHubProps {
  surface?: 'desktop' | 'mobile';
}

export const GuidesHub: React.FC<GuidesHubProps> = ({ surface = 'desktop' }) => {
  const navigate = useGuardedNavigate();

  const guidesList = Object.entries(guidesData as Record<string, GuideDocument>).map(
    ([slug, doc]) => ({
      slug,
      ...doc
    })
  );

  const handleCardClick = (slug: string) => {
    const target = surface === 'mobile' ? `/mobile${slug}` : slug;
    navigate(target);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 text-[var(--text-primary)]">
      <header className="mb-10 text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-[var(--accent-primary)]">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Research Publications</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          PULSE Guides & Cognitive Benchmarks
        </h1>
        <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
          Scientific documentation on human reaction latency, sensory-motor arcs, and session-level empirical distributions.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guidesList.map((guide) => {
          const isBenchmark = guide.slug.startsWith('/benchmarks');
          const Icon = isBenchmark ? BarChart3 : Clock;

          return (
            <div
              key={guide.slug}
              onClick={() => handleCardClick(guide.slug)}
              className="group cursor-pointer p-6 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all flex flex-col justify-between space-y-4 hover:shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {guide.datePublished}
                  </span>
                </div>
                <h2 className="text-xl font-bold group-hover:text-[var(--accent-primary)] transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                  {guide.subtitle}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[var(--accent-primary)]">
                <span>Read Full Document</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
