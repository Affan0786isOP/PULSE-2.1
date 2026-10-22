import { Link } from 'react-router-dom';
import { PulseLogo } from '../brand';

const destinations = [
  ['Assessments', '/assessments'],
  ['Leaderboard', '/leaderboard'],
  ['Analytics', '/analytics'],
  ['Dataset', '/dataset'],
  ['Privacy', '/privacy'],
];

export function MobileHomeFooter() {
  return (
    <footer data-home-scene="footer" className="w-full border-t py-7" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4">
        <div>
          <a href="#hero" aria-label="PULSE homepage" className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2" style={{ outlineColor: 'var(--focus-ring)' }}><PulseLogo variant="horizontal" size={24} color="var(--accent)" textColor="var(--text-primary)" /><span className="font-mono text-[9px] font-medium tracking-widest" style={{ color: 'var(--text-muted)' }}>OBSERVATORY</span></a>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Browser-based response and memory assessments.</p>
        </div>
        <nav aria-label="Homepage footer" className="flex flex-wrap gap-x-4 gap-y-3 text-xs">
          {destinations.map(([label, to]) => <Link key={to} to={to} className="focus-visible:outline-none focus-visible:ring-2" style={{ color: 'var(--text-secondary)', outlineColor: 'var(--focus-ring)' }}>{label}</Link>)}
          <a href="#hero" className="focus-visible:outline-none focus-visible:ring-2" style={{ color: 'var(--text-secondary)', outlineColor: 'var(--focus-ring)' }}>Back to top ↑</a>
        </nav>
      </div>
    </footer>
  );
}
