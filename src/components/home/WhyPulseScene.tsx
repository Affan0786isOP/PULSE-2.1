const principles = [
  ['01', 'Precision timing', 'Use consistent browser timestamps to examine observed intervals, while acknowledging the limits of consumer hardware.'],
  ['02', 'Repeatable protocols', 'Follow defined instructions so results can be compared more meaningfully under similar conditions.'],
  ['03', 'Statistical clarity', 'Look beyond a headline score: know which trials counted and what the summary represents.'],
  ['04', 'Privacy by choice', 'A test can be completed without sign-up. Any research contribution remains optional where offered.'],
];

export function WhyPulseScene() {
  return (
    <section id="why-pulse" data-home-scene="why-pulse" aria-labelledby="why-pulse-heading" className="w-full border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-[#12161B] lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">05 / Why PULSE</p>
          <h2 id="why-pulse-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">Measure with context, not hype.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">A useful benchmark is transparent about what it observes, how a protocol works, and what a result can—and cannot—tell you.</p>
        </div>
        <ol className="border-t border-slate-200 dark:border-slate-800">
          {principles.map(([number, title, body]) => (
            <li key={number} className="grid gap-3 border-b border-slate-200 py-5 dark:border-slate-800 sm:grid-cols-[4rem_0.75fr_1.25fr] sm:items-start sm:gap-5 sm:py-6">
              <span className="font-mono text-xs text-[#0066FF] dark:text-[#22C7D6]">{number}</span>
              <h3 className="font-heading text-lg font-semibold text-[#090D1A] dark:text-white">{title}</h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
