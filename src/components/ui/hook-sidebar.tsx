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
                  borderLeftColor: isActive ? color : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
                className={`w-full text-left px-3 py-1.5 rounded-r-md text-xs font-mono transition-all duration-150 border-l-2 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-2)]/70 font-semibold'
                    : 'hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]'
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
