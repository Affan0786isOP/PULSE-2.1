import { MobileSceneFrame } from './MobileSceneFrame';

export function MobileProblemScene() {
  return (
    <MobileSceneFrame id="problem" eyebrow="03 / The question" title="How fast are you, really?" description="Feeling quick is subjective. A structured task gives you an observed response time to examine instead of relying on intuition alone.">
      <div className="grid gap-3">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Perception</p>
          <p className="mt-3 font-heading text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>“That felt fast.”</p>
          <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>Memory, expectation and fatigue shape how a response feels.</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--accent)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Measurement</p>
          <p className="mt-3 font-heading text-lg font-semibold">“Here is the timing.”</p>
          <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>Defined instructions make observations easier to review and repeat under similar conditions.</p>
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>Display refresh, input hardware, browser scheduling and background load can affect observed timing.</p>
    </MobileSceneFrame>
  );
}
