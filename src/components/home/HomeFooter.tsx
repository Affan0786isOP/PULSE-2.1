import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export function HomeFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0B0D10]/80 backdrop-blur-md py-14 px-6 sm:px-12 mt-12 relative z-10 transition-colors duration-300"
      aria-label="Site Footer"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
        {/* Brand & Description Column */}
        <div className="md:col-span-5 flex flex-col items-start">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/30 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6]">
              <Activity size={16} />
            </div>
            <span className="font-heading text-lg font-bold tracking-wider text-[#090D1A] dark:text-white">
              PULSE <span className="text-xs font-mono text-[#0066FF] dark:text-[#22C7D6] font-normal">2.1</span>
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mb-6">
            A standardized behavioral testing suite implementing client-side cognitive reaction and memory benchmarking with transparent methodology.
          </p>

          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            © {currentYear} PULSE Engineering. All rights reserved.
          </span>
        </div>

        {/* Navigation Links Column */}
        <div className="md:col-span-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#0066FF] dark:text-[#22C7D6] font-bold mb-4">
            System Directory
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link 
                to="/assessments" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Assessments Catalog
              </Link>
            </li>
            <li>
              <Link 
                to="/leaderboard" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Leaderboard
              </Link>
            </li>
            <li>
              <Link 
                to="/dataset" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Dataset
              </Link>
            </li>
            <li>
              <Link 
                to="/privacy" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Research Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Homepage Sections Column */}
        <div className="md:col-span-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#0066FF] dark:text-[#22C7D6] font-bold mb-4">
            Overview
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a 
                href="#proof" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Proof & Pipeline
              </a>
            </li>
            <li>
              <a 
                href="#assessments" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Assessments
              </a>
            </li>
            <li>
              <a 
                href="#why-pulse" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                Why PULSE
              </a>
            </li>
            <li>
              <a 
                href="#how-it-works" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                How It Works
              </a>
            </li>
            <li>
              <a 
                href="#faq" 
                className="text-slate-600 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#22C7D6] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
              >
                FAQ
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
