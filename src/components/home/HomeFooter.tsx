import { Link } from 'react-router-dom';

const destinations = [
  ['Assessments', '/assessments'],
  ['Leaderboard', '/leaderboard'],
  ['Analytics', '/analytics'],
  ['Dataset', '/dataset'],
  ['Privacy', '/privacy'],
];

export function HomeFooter() {
  return (
    <footer data-home-scene="footer" className="w-full border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <a href="#hero" className="font-heading text-lg font-extrabold tracking-tight text-[#090D1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:text-white dark:focus-visible:ring-[#22C7D6]">PULSE<span className="ml-2 font-mono text-[10px] font-medium tracking-widest text-slate-500 dark:text-slate-400">OBSERVATORY</span></a>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Browser-based response and memory assessments.</p>
        </div>
        <nav aria-label="Homepage footer" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {destinations.map(([label, to]) => <Link key={to} to={to} className="text-slate-600 transition-colors hover:text-[#0066FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:text-slate-300 dark:hover:text-[#22C7D6] dark:focus-visible:ring-[#22C7D6]">{label}</Link>)}
          <a href="#hero" className="text-slate-600 transition-colors hover:text-[#0066FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:text-slate-300 dark:hover:text-[#22C7D6] dark:focus-visible:ring-[#22C7D6]">Back to top ↑</a>
        </nav>
      </div>
    </footer>
  );
}
