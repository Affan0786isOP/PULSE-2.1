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
            className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-[transform,background-color,border-color,color] border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-95 ${
              isActive
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-semibold'
                : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] active:bg-[var(--surface-2)]'
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
