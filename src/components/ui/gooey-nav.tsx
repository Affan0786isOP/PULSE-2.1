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
    <ul 
      className={`flex items-center gap-1 p-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] list-none m-0 ${className}`}
    >
      {items.map((item, index) => {
        const label = typeof item === 'string' ? item : item.label;
        const to = typeof item === 'object' && item ? item.to : undefined;
        const isActive = value === index;
        const itemClassName = `px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-[color,background-color,border-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-95 ${
          isActive 
            ? 'text-white dark:text-slate-950 font-semibold' 
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] active:bg-white/[0.08]'
        }`;

        if (to) {
          return (
            <li key={label} className="list-none m-0 p-0 flex items-center">
              <Link
                to={to}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  backgroundColor: isActive ? activeColor : 'transparent',
                }}
                className={itemClassName}
              >
                {label}
              </Link>
            </li>
          );
        }

        return (
          <li key={label} className="list-none m-0 p-0 flex items-center">
            <button
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
          </li>
        );
      })}
    </ul>
  );
}
