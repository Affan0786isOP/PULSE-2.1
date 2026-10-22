import { DesktopAssessmentCarousel } from '../ui/DesktopAssessmentCarousel';

export function AssessmentsScene() {
  return (
    <section id="assessments" data-home-scene="assessments" aria-labelledby="assessments-scene-heading" className="w-full py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">02 / Protocol library</p>
            <h2 id="assessments-scene-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">Choose what you want to measure.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">Explore the five current protocols. Each measures a different part of response or memory performance.</p>
        </div>
        <DesktopAssessmentCarousel />
      </div>
    </section>
  );
}
