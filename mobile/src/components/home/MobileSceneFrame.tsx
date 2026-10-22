import type { ReactNode } from 'react';

type MobileSceneFrameProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function MobileSceneFrame({ id, eyebrow, title, description, children }: MobileSceneFrameProps) {
  return (
    <section id={id} data-home-scene={id} aria-labelledby={id + '-heading'} className="w-full border-t py-10" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>
      <div className="mx-auto w-full max-w-xl px-4">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{eyebrow}</p>
        <h2 id={id + '-heading'} className="font-heading text-2xl font-bold tracking-tight leading-tight">{title}</h2>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
