import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import assessmentContent from '../../shared/content/assessmentContent.json';
import { AssessmentContentMap } from '../../shared/types/assessmentContent';

interface AssessmentInfoPanelProps {
  route: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AssessmentInfoPanel: React.FC<AssessmentInfoPanelProps> = ({
  route,
  isOpen,
  onClose
}) => {
  const contentMap = assessmentContent as AssessmentContentMap;
  const article = contentMap[route];
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const getFocusableElements = () => {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    if (!isOpen) {
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) opener.focus();
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && !panelRef.current?.contains(activeElement)) {
      openerRef.current = activeElement;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!article) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Drawer */}
      <div
        ref={panelRef}
        id="assessment-info-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-info-title"
        inert={!isOpen}
        aria-hidden={!isOpen ? 'true' : 'false'}
        className={`fixed top-0 right-0 h-full w-full max-w-xl bg-[var(--surface-1,#11151c)] border-l border-[var(--border-subtle,#1e293b)] text-[var(--text-main,#f4f7fa)] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle,#1e293b)]">
          <span className="text-xs font-mono font-semibold text-cyan-400 tracking-wider uppercase">
            Assessment Guide &amp; Methodology
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Close information dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Article Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <article id="assessment-seo-article" className="space-y-8">
            <header className="space-y-2">
              <h2
                id="assessment-info-title"
                className="text-2xl font-bold tracking-tight text-white"
              >
                {article.title}
              </h2>
              <p className="text-sm font-medium text-cyan-400">
                {article.subtitle}
              </p>
            </header>

            {/* Sections */}
            {article.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-100">
                  {section.heading}
                </h3>
                {section.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-sm leading-relaxed text-slate-300">
                    {p}
                  </p>
                ))}
                {section.listItems && section.listItems.length > 0 && (
                  <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
                    {section.listItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* FAQ */}
            {article.faq && article.faq.length > 0 && (
              <section id="faq" className="space-y-4 pt-4 border-t border-[var(--border-subtle,#1e293b)]">
                <h3 className="text-lg font-semibold text-slate-100">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  {article.faq.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="text-sm font-medium text-slate-200">
                        {item.question}
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-400">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Related Resources */}
            {article.relatedLinks && article.relatedLinks.length > 0 && (
              <section
                id="related-resources"
                className="space-y-4 pt-4 border-t border-[var(--border-subtle,#1e293b)]"
              >
                <h3 className="text-lg font-semibold text-slate-100">
                  Related Assessments
                </h3>
                <div className="grid gap-3">
                  {article.relatedLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.path}
                      onClick={() => onClose()}
                      className="group p-3 rounded-lg border border-[var(--border-subtle,#1e293b)] bg-[var(--surface-2,#0d1117)] hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all block"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">
                        <span>{link.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {link.description}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </>
  );
};
