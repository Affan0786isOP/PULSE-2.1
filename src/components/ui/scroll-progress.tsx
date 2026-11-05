import React from 'react';

interface ScrollProgressSection {
  id: string;
  label: string;
}

interface ScrollProgressProps {
  sections: ScrollProgressSection[];
  containerRef?: React.RefObject<HTMLElement | null>;
  offset?: number;
  activeId?: string;
  onSelectSection?: (section: ScrollProgressSection, index: number) => void;
  className?: string;
}

export function ScrollProgress({
  sections,
  activeId,
  onSelectSection,
  className = '',
}: ScrollProgressProps) {
  return (
    <div className={`w-full overflow-x-auto py-2 flex items-center gap-2 no-scrollbar ${className}`}>
      {sections.map((section, idx) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelectSection?.(section, idx)}
            className={`px-3 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
              isActive
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
