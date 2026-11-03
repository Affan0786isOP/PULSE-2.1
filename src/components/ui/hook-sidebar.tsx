import React from 'react';

interface HookSidebarItem {
  id: string;
  label: string;
}

interface HookSidebarProps {
  items: HookSidebarItem[];
  value: number;
  onChange: (index: number) => void;
  color?: string;
  label?: string;
  className?: string;
}

export function HookSidebar({
  items,
  value,
  onChange,
  color = 'var(--accent)',
  label,
  className = '',
}: HookSidebarProps) {
  return (
    <nav className={`flex flex-col space-y-1 ${className}`}>
      {label && (
        <div data-slot="hook-sidebar-label" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">
          {label}
        </div>
      )}
      <ul className="flex flex-col space-y-1">
        {items.map((item, index) => {
          const isActive = value === index;
          return (
            <li key={item.id}>
              <button
                type="button"
                data-slot="hook-sidebar-item"
                onClick={() => onChange(index)}
                style={{
                  borderLeftColor: isActive ? (color || 'var(--accent)') : 'transparent',
                }}
                className={`w-full text-left px-3 py-1.5 rounded-r-md text-xs font-mono transition-colors duration-150 border-l-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                  isActive
                    ? 'bg-sky-50 dark:bg-[#181D23] font-semibold text-[#0066FF] dark:text-[#22C7D6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#12161B] hover:text-[#090D1A] dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
