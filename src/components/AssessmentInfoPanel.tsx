import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import assessmentContent from '../../shared/content/assessmentContent.json';
import type { AssessmentArticle } from '../../shared/types/assessmentContent';

type AssessmentId =
  | 'visual-reaction'
  | 'direction'
  | 'color-recognition'
  | 'block-memory'
  | 'number-memory';

type AssessmentInfoPanelProps = {
  assessmentId: AssessmentId;
  isAssessmentActive: boolean;
};

function getArticle(assessmentId: AssessmentId): AssessmentArticle | null {
  const article = Object.values(assessmentContent as Record<string, AssessmentArticle>)
    .find((item) => item.assessmentId === assessmentId);
  return article ?? null;
}

export function AssessmentInfoPanel({
  assessmentId,
  isAssessmentActive,
}: AssessmentInfoPanelProps) {
  const article = getArticle(assessmentId);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isAssessmentActive && isOpen) {
      setIsOpen(false);
    }
  }, [isAssessmentActive, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !panelRef.current) return;
    const active = document.activeElement;
    if (active && panelRef.current.contains(active)) {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  if (!article) return null;

  return (
    <>
      <div className="w-full max-w-[800px] px-4 mb-3 flex justify-end relative z-40">
        <button
          ref={triggerRef}
          type="button"
          aria-label="About this assessment and methodology"
          aria-expanded={isOpen}
          aria-controls="assessment-info-panel"
          disabled={isAssessmentActive}
          title={isAssessmentActive ? 'Finish the assessment before opening the information panel' : 'About this assessment and methodology'}
          onClick={() => setIsOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] transition-colors hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)]/40 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <Info size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[90] bg-black/65 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />

      <aside
        id="assessment-info-panel"
        ref={panelRef}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`fixed inset-y-0 right-0 z-[100] w-full max-w-2xl overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--cyan-primary)]">Assessment information</div>
            <h2 className="mt-1 truncate text-lg font-heading font-bold text-[var(--text-primary)]">{article.title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close assessment information"
            onClick={() => {
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <article id="assessment-seo-article" className="px-5 pb-10 pt-6 sm:px-8">
          <p className="mb-7 text-sm leading-7 text-[var(--text-secondary)]">{article.subtitle}</p>

          <div className="space-y-8">
            {article.sections.map((section) => (
              <section key={section.id}>
                <h3 className="mb-2 text-base font-heading font-semibold text-[var(--text-primary)]">{section.heading}</h3>
                <div className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.listItems?.length ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.listItems.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}

            {article.faq.length > 0 ? (
              <section aria-labelledby="assessment-faq-heading">
                <h3 id="assessment-faq-heading" className="mb-4 text-base font-heading font-semibold text-[var(--text-primary)]">Frequently asked questions</h3>
                <div className="space-y-5">
                  {article.faq.map((item) => (
                    <div key={item.question}>
                      <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{item.question}</h4>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {article.relatedLinks.length > 0 ? (
              <section aria-labelledby="assessment-related-heading">
                <h3 id="assessment-related-heading" className="mb-4 text-base font-heading font-semibold text-[var(--text-primary)]">Related PULSE assessments</h3>
                <div className="grid gap-3">
                  {article.relatedLinks.map((link) => (
                    <a
                      key={link.path}
                      href={link.path}
                      className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.03] p-4 transition-colors hover:border-[var(--cyan-primary)]/40 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      <span className="block text-sm font-semibold text-[var(--text-primary)]">{link.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{link.description}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </aside>
    </>
  );
}
