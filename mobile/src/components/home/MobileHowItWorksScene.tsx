import { MobileSceneFrame } from './MobileSceneFrame';

const steps = [
  ['Choose a protocol', 'Select the assessment that interests you.'],
  ['Complete the test', 'Follow the instructions and finish the trial sequence.'],
  ['Review your telemetry', 'Explore the metrics the protocol reports, with trial context where available.'],
  ['Optional research contribution', 'Where PULSE offers research sharing, choose voluntarily whether to contribute data. Testing itself does not require sharing.'],
];

export function MobileHowItWorksScene() {
  return (
    <MobileSceneFrame id="how-it-works" eyebrow="06 / The process" title="Four simple steps." description="A clear path from task to an interpretable result.">
      <ol className="flex flex-col gap-2.5">
        {steps.map(([title, body], index) => (
          <li key={title} className="flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-2)' }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]" style={{ color: 'var(--accent)', borderColor: 'var(--border-default)' }}>0{index + 1}</span>
            <div>
              <h3 className="font-heading text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </MobileSceneFrame>
  );
}
