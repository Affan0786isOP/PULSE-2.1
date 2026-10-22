import { MobileSceneFrame } from './MobileSceneFrame';

const bars = [32, 48, 64, 80, 92, 73, 59, 42, 28, 18];

export function MobileResultScene() {
  return (
    <MobileSceneFrame id="result" eyebrow="04 / Read the signal" title="A number needs context." description="This is a visual example of a reaction-time result, not a participant result, target or performance benchmark.">
      <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Illustrative telemetry</p>
            <p className="mt-2 font-heading text-5xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>142<span className="ml-1 text-base font-semibold">ms</span></p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Visual reaction time · Example only</p>
          </div>
          <span className="rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-wider" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Sample</span>
        </div>
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-3 flex justify-between font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}><span>Response spread</span><span>Illustration</span></div>
          <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
            {bars.map((height, index) => <span key={index} className="flex-1 rounded-t-sm" style={{ height: height + '%', backgroundColor: 'var(--accent-subtle)' }} />)}
          </div>
          <div className="mt-2 flex justify-between text-[9px]" style={{ color: 'var(--text-muted)' }}><span>Faster</span><span>Slower</span></div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>Where available, trial spread, consistency and validity help explain a headline value.</p>
    </MobileSceneFrame>
  );
}
