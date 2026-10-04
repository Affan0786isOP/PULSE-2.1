import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FileQuestion, ArrowRight } from 'lucide-react';

export function NotFound({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-subtle)] flex flex-col relative overflow-hidden">
      <Navbar currentView="" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-6">
          <FileQuestion size={32} strokeWidth={1.5} />
        </div>
        
        <h1 className="font-heading text-5xl sm:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          404
        </h1>
        <h2 className="font-heading text-xs text-[var(--accent)] tracking-widest font-semibold mb-4 uppercase">
          PROTOCOL NOT FOUND
        </h2>
        
        <p className="font-sans text-[var(--text-secondary)] max-w-sm mx-auto text-xs sm:text-sm leading-relaxed mb-8">
          The requested module or assessment path does not exist in the active telemetry registry.
        </p>

        <button type="button" 
          onClick={() => onNavigate('home')}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-semibold rounded-xl px-6 py-3 flex items-center gap-2.5 transition-all group active:scale-95 cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <span>Return to Dashboard</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </main>

      <Footer />
    </div>
  );
}
