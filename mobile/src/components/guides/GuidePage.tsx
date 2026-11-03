import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import guidesData from '../../../../shared/content/guides.json';
import { GuideDocument } from '../../../../shared/content/guideValidator.d.mts';
import { BookOpen, ArrowRight, ExternalLink } from 'lucide-react';

interface GuidePageProps {
  surface?: 'desktop' | 'mobile';
}

export const GuidePage: React.FC<GuidePageProps> = ({ surface = 'desktop' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize canonical slug
  let slug = location.pathname;
  if (surface === 'mobile' && slug.startsWith('/mobile')) {
    slug = slug.slice('/mobile'.length) || '/';
  }

  const guide = (guidesData as Record<string, GuideDocument>)[slug];

  if (!guide) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Guide Not Found</h1>
        <p className="text-[var(--text-secondary)] mb-6">The requested scientific guide or benchmark could not be found.</p>
        <button
          onClick={() => navigate(surface === 'mobile' ? '/mobile/guides' : '/guides')}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-black font-semibold text-sm"
        >
          View All Guides
        </button>
      </div>
    );
  }

  const handleCtaClick = () => {
    if (!guide.interactiveCta) return;
    const target = surface === 'mobile'
      ? `/mobile${guide.interactiveCta.targetPath}?ref=${guide.interactiveCta.referralToken}`
      : `${guide.interactiveCta.targetPath}?ref=${guide.interactiveCta.referralToken}`;
    navigate(target);
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 text-[var(--text-primary)]">
      <header className="mb-8 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent-primary)] mb-3">
          <BookOpen className="w-4 h-4" />
          <span>PULSE Research Protocol</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
          {guide.title}
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed mb-4">
          {guide.subtitle}
        </p>
        <div className="text-xs text-[var(--text-muted)]">
          <span>By PULSE Cognitive Research Team</span>
          <span className="mx-2">•</span>
          <span>Published {guide.datePublished}</span>
        </div>
      </header>

      <div className="space-y-8 leading-relaxed text-[var(--text-secondary)]">
        {guide.sections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] pt-2">
              {section.heading}
            </h2>
            {section.paragraphs.map((p, idx) => (
              <p key={idx} className="text-base md:text-lg leading-relaxed">
                {p}
              </p>
            ))}
            {section.listItems && section.listItems.length > 0 && (
              <ul className="list-disc pl-6 space-y-2 text-sm md:text-base">
                {section.listItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {guide.interactiveCta && (
          <div className="my-10 p-6 md:p-8 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--accent-primary)]/40 text-center space-y-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Evaluate Your Personal Baseline
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
              Measure your reaction latency or cognitive interference against real-time scientific telemetry.
            </p>
            <button
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-black font-semibold text-sm hover:brightness-110 transition-all shadow-md"
            >
              <span>{guide.interactiveCta.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {guide.citations && guide.citations.length > 0 && (
          <footer className="mt-12 pt-6 border-t border-[var(--border-subtle)] space-y-3">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Academic References & Citations
            </h3>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-muted)]">
              {guide.citations.map((c, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-medium text-[var(--text-secondary)]">{c.author}</span> ({c.year}). {c.title}.
                  {c.journal && <em className="ml-1">{c.journal}</em>}
                  {c.doi && (
                    <a
                      href={`https://doi.org/${c.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 ml-1 text-[var(--accent-primary)] hover:underline"
                    >
                      <span>DOI:{c.doi}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </footer>
        )}
      </div>
    </article>
  );
};
