import { Link } from 'react-router-dom';
import { MobileSceneFrame } from './MobileSceneFrame';

export function MobileFinalCTAScene() {
  return (
    <MobileSceneFrame id="final-cta" eyebrow="08 / Your first measurement" title="See your response in context." description="Pick a protocol, complete the task, and review the result from your own session.">
      <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}>
        <Link to="/reaction-test" className="flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2" style={{ backgroundColor: 'var(--accent)', color: 'var(--surface-0)', outlineColor: 'var(--focus-ring)' }}>Start assessment <span aria-hidden="true">→</span></Link>
        <Link to="/assessments" className="mt-3 flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)', outlineColor: 'var(--focus-ring)' }}>View all protocols</Link>
      </div>
    </MobileSceneFrame>
  );
}
