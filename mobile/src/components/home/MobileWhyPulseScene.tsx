import { MobileSceneFrame } from './MobileSceneFrame';

const principles = [
  ['Precision timing', 'Use consistent browser timestamps while acknowledging the limits of consumer hardware.'],
  ['Repeatable protocols', 'Follow defined instructions to make repeated sessions more comparable.'],
  ['Statistical clarity', 'Understand which trials counted and what a summary metric represents.'],
  ['Privacy by choice', 'Testing needs no sign-up; research sharing is optional where offered.'],
];

export function MobileWhyPulseScene() {
  return (
    <MobileSceneFrame id="why-pulse" eyebrow="05 / Why PULSE" title="Context, not hype." description="A useful benchmark explains what it observes and what a result can—and cannot—tell you.">
      <ol className="divide-y border-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {principles.map(([title, body], index) => (
          <li key={title} className="py-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>0{index + 1}</span>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
            </div>
            <p className="mt-2 pl-8 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
          </li>
        ))}
      </ol>
    </MobileSceneFrame>
  );
}
