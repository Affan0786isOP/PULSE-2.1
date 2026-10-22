export function ProblemScene() {
  return (
    <section id="problem" data-home-scene="problem" aria-labelledby="problem-heading" className="w-full border-y border-slate-200 bg-slate-50/80 py-20 dark:border-slate-800 dark:bg-[#0B0D10] lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">03 / The question</p>
          <h2 id="problem-heading" className="font-heading text-4xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-5xl">How fast are you, <span className="text-[#0066FF] dark:text-[#22C7D6]">really?</span></h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">Feeling quick is subjective. A structured task gives you an observable response time that you can review instead of relying on memory or intuition alone.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#12161B]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Perception</p>
            <p className="mt-5 font-heading text-2xl font-semibold text-slate-400 dark:text-slate-500">“That felt fast.”</p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Memory, expectation, fatigue and context shape how a response feels.</p>
          </div>
          <div className="rounded-2xl border border-[#0066FF]/30 bg-[#EFF6FF] p-6 dark:border-[#22C7D6]/30 dark:bg-[#12161B]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#0066FF] dark:text-[#22C7D6]">Measurement</p>
            <p className="mt-5 font-heading text-2xl font-semibold text-[#090D1A] dark:text-white">“Here is the timing.”</p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">A defined protocol makes the observation easier to examine and repeat under similar conditions.</p>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-5 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:px-8">Observed timing can still be influenced by display refresh, input hardware, browser scheduling and background load.</p>
    </section>
  );
}
