const stages = [
  {
    number: '01',
    title: 'Stimulus presentation',
    description: 'Visual prompts are coordinated with the browser rendering cycle. Actual display cadence still depends on the device and browser.',
  },
  {
    number: '02',
    title: 'Human response capture',
    description: 'Input events are timestamped with performance.now(), a monotonic browser clock.',
  },
  {
    number: '03',
    title: 'Trial validation',
    description: 'Protocol rules screen out invalid and timed-out trials. Reaction-time values below the 80 ms validity floor are not treated as valid responses.',
  },
  {
    number: '04',
    title: 'Session summary',
    description: 'A result is easier to interpret when central response time is considered alongside spread, consistency, and trial validity where available.',
  },
];

export function ProofScene() {
  return (
    <section id="proof" data-home-scene="proof" aria-labelledby="proof-heading" className="w-full border-y border-slate-200 bg-white/80 py-20 dark:border-slate-800 dark:bg-[#12161B] lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
        <header className="max-w-xl">
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">01 / Measurement pipeline</p>
          <h2 id="proof-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">From stimulus to a measurable response.</h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            PULSE turns a response into a timestamped observation, then applies protocol rules before summarizing a session. It measures browser-observed timing, not a laboratory guarantee of neural onset.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-[#181D23] dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#0066FF] dark:bg-[#22C7D6]" aria-hidden="true" />
            Stimulus <span aria-hidden="true">→</span> Response <span aria-hidden="true">→</span> Measurement <span aria-hidden="true">→</span> Result
          </div>
        </header>
        <ol className="divide-y divide-slate-200 dark:divide-slate-800">
          {stages.map((stage) => (
            <li key={stage.number} className="grid grid-cols-[3.25rem_1fr] gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[4rem_1fr] sm:gap-5">
              <span className="font-mono text-sm text-[#0066FF] dark:text-[#22C7D6]">{stage.number}</span>
              <div>
                <h3 className="font-heading text-lg font-semibold text-[#090D1A] dark:text-white">{stage.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
