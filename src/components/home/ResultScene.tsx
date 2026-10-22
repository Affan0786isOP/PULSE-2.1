const bars = [34, 48, 62, 78, 91, 76, 58, 42, 29, 18];

export function ResultScene() {
  return (
    <section id="result" data-home-scene="result" aria-labelledby="result-heading" className="w-full py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <header>
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">04 / Read the signal</p>
          <h2 id="result-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">A result is more than a number.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">The example below shows how a single reaction-time value might be presented. Real results come from your own session; this number is illustrative, not a benchmark or a participant result.</p>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Where a protocol provides them, trial spread, consistency and validity add context to the headline metric.</p>
        </header>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#12161B] sm:p-9">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0066FF]/10 blur-3xl dark:bg-[#22C7D6]/10" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Illustrative telemetry</p>
                <h3 className="mt-3 font-heading text-6xl font-extrabold tracking-[-0.06em] text-[#0066FF] dark:text-[#22C7D6] sm:text-7xl">142<span className="ml-1 text-2xl font-semibold tracking-normal">ms</span></h3>
                <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Visual reaction time · Example only</p>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Sample</span>
            </div>
            <div className="mt-9 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Response distribution</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Decorative illustration</span>
              </div>
              <div className="flex h-24 items-end gap-2" aria-hidden="true">
                {bars.map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-[#0066FF]/25 dark:bg-[#22C7D6]/25" style={{ height: height + '%' }} />)}
              </div>
              <div className="mt-3 flex justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400"><span>Faster</span><span>Slower</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
