import { MobileSceneFrame } from './MobileSceneFrame';

const stages = [
  ['01', 'Present', 'Visual prompts follow the browser rendering cycle; the displayed frame cadence depends on the device.'],
  ['02', 'Timestamp', 'Responses are recorded with performance.now(), a monotonic browser clock.'],
  ['03', 'Validate', 'Protocol rules flag invalid or timed-out trials. Values below the 80 ms reaction-time validity floor are not counted as valid responses.'],
  ['04', 'Summarize', 'Review the session metric with spread and consistency information where the protocol provides it.'],
];

export function MobileProofScene() {
  return (
    <MobileSceneFrame id="proof" eyebrow="01 / Measurement pipeline" title="From stimulus to result." description="PULSE turns browser-observed responses into timestamped measurements, then checks trials against protocol rules.">
      <ol className="flex flex-col gap-3">
        {stages.map(([number, title, body]) => (
          <li key={number} className="flex gap-3 rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}>
            <span className="pt-0.5 font-mono text-xs" style={{ color: 'var(--accent)' }}>{number}</span>
            <div>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>Observed browser timing is not a laboratory guarantee of neural onset.</p>
    </MobileSceneFrame>
  );
}
