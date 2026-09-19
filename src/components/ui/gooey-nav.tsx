import React from 'react';

interface GooeyNavProps {
  items: string[];
  value: number;
  onChange: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
  activeLabelColor?: string;
  className?: string;
}

export function GooeyNav({
  items,
  value,
  onChange,
  activeColor = 'var(--accent)',
  activeLabelColor = 'white',
  className = '',
}: GooeyNavProps) {
  return (
    <nav className={`flex items-center gap-1 p-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] ${className}`}>
      {items.map((item, index) => {
        const isActive = value === index;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(index)}
            style={{
              backgroundColor: isActive ? activeColor : 'transparent',
              color: isActive ? activeLabelColor : 'var(--text-secondary)',
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 cursor-pointer ${
              isActive ? 'shadow-sm' : 'hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
            }`}
          >
            {item}
          </button>
        );
      })}
    </nav>
  );
}
