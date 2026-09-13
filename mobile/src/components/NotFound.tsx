import React from 'react';
import { Navbar } from './Navbar';
import { FileQuestion, ArrowRight } from 'lucide-react';

export function NotFound({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-primary)] font-sans selection:bg-cyan-500/30 flex flex-col relative overflow-hidden">
      <Navbar currentView="" onNavigate={onNavigate} onBack={() => onNavigate('home')} />

      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center">
        <div className="w-16 h-16 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-6">
          <FileQuestion size={32} strokeWidth={1.5} />
        </div>
        
        <h1 className="font-heading text-5xl sm:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
          404
        </h1>
        <h2 className="font-heading text-sm text-[var(--accent)] tracking-widest font-semibold mb-4 uppercase">
          PAGE NOT FOUND
        </h2>
        
        <p className="font-sans text-[var(--text-secondary)] max-w-xs mx-auto text-xs sm:text-sm leading-relaxed mb-8">
          The module or assessment you are looking for does not exist in the current system registry.
        </p>

        <button type="button" 
          onClick={() => onNavigate('home')}
          className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-lg px-6 py-3 flex items-center gap-2.5 transition-all group active:scale-95 cursor-pointer text-xs font-semibold text-[var(--text-primary)]"
        >
          <span>Return to Dashboard</span>
          <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
        </button>
      </main>
    </div>
  );
}
