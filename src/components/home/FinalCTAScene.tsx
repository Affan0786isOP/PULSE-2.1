import { Link } from 'react-router-dom';

export function FinalCTAScene() {
  return (
    <section id="final-cta" data-home-scene="final-cta" aria-labelledby="final-cta-heading" className="w-full py-16 lg:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#0066FF]/25 bg-[#EFF6FF] px-6 py-12 dark:border-[#22C7D6]/25 dark:bg-[#12161B] sm:px-10 lg:px-14 lg:py-16">
        <div className="absolute -right-14 -top-16 h-64 w-64 rounded-full bg-[#0066FF]/10 blur-3xl dark:bg-[#22C7D6]/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">08 / Your first measurement</p>
            <h2 id="final-cta-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-5xl">See what your next response looks like.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">Choose a protocol, follow the instructions, and review the result from your own session.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link to="/reaction-test" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0066FF] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0052CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 dark:bg-[#22C7D6] dark:text-[#0B0D10] dark:hover:bg-[#35D4E1]">Start assessment <span aria-hidden="true">→</span></Link>
            <Link to="/assessments" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-[#181D23] dark:text-white dark:hover:bg-[#222831]">View all protocols</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
