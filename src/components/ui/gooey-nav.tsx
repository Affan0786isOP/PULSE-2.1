import React from 'react';
import { Link } from 'react-router-dom';

export interface GooeyNavItem {
  label: string;
  to?: string;
}

interface GooeyNavProps {
  items: (string | GooeyNavItem)[];
  value: number;
  onChange: (index: number) => void;
  activeColor?: string;
  className?: string;
}

export function GooeyNav({
  items,
  value,
  onChange,
  activeColor = 'var(--accent)',
  className = '',
}: GooeyNavProps) {
  return (
    <div 
      role="group" 
      aria-label="Main Navigation Items" 
      className={`flex items-center gap-1 p-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] ${className}`}
    >
      {items.map((item, index) => {
        const label = typeof item === 'string' ? item : item.label;
        const to = typeof item === 'object' && item ? item.to : undefined;
        const isActive = value === index;
        const itemClassName = `px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-[color,background-color,border-color,box-shadow] duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          isActive 
            ? 'shadow-sm text-white dark:text-slate-950 font-semibold' 
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
        }`;

        if (to) {
          return (
            <Link
              key={label}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              style={{
                backgroundColor: isActive ? activeColor : 'transparent',
              }}
              className={itemClassName}
            >
              {label}
            </Link>
          );
        }

        return (
          <button
            key={label}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(index)}
            style={{
              backgroundColor: isActive ? activeColor : 'transparent',
            }}
            className={itemClassName}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
