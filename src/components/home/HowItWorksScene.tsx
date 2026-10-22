const steps = [
  ['01', 'Choose', 'Pick the protocol that interests you.'],
  ['02', 'Test', 'Follow the on-screen instructions and complete the trials.'],
  ['03', 'Measure', 'Review the metrics produced by your session.'],
  ['04', 'Understand', 'Interpret the result in the context of the task and your device.'],
];

export function HowItWorksScene() {
  return (
    <section id="how-it-works" data-home-scene="how-it-works" aria-labelledby="how-heading" className="w-full py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">06 / The process</p>
          <h2 id="how-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">Four steps. One clearer picture.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Start with a task, then give the result enough context to be useful.</p>
        </div>
        <ol className="grid gap-0 border-y border-slate-200 dark:border-slate-800 md:grid-cols-4 md:divide-x md:divide-slate-200 dark:md:divide-slate-800">
          {steps.map(([number, title, body], index) => (
            <li key={number} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-slate-200 py-5 last:border-b-0 dark:border-slate-800 md:block md:border-b-0 md:p-5 md:first:pl-0 md:last:pr-0">
              <span className="font-mono text-sm text-[#0066FF] dark:text-[#22C7D6]">/{number}</span>
              <div>
                <h3 className="font-heading text-xl font-semibold text-[#090D1A] dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
              </div>
              {index < steps.length - 1 && <span className="sr-only">Then</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
