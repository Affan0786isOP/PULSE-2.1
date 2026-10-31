/**
 * Runtime ES module validator for guide JSON content.
 * Consumed by both scripts/generate-seo-pages.mjs and Vitest test suites.
 */

export function validateGuideContent(guidesData) {
  if (!guidesData || typeof guidesData !== 'object') {
    throw new Error('Guide content must be a non-null object');
  }

  const requiredSlugs = [
    '/guides/visual-reaction-time',
    '/guides/stroop-effect-speed',
    '/benchmarks/cognitive-percentiles'
  ];

  for (const slug of requiredSlugs) {
    const doc = guidesData[slug];
    if (!doc) {
      throw new Error(`Missing required guide document: ${slug}`);
    }

    if (!doc.title || typeof doc.title !== 'string') {
      throw new Error(`Guide ${slug} missing valid 'title'`);
    }

    if (!doc.subtitle || typeof doc.subtitle !== 'string') {
      throw new Error(`Guide ${slug} missing valid 'subtitle'`);
    }

    if (!doc.datePublished || typeof doc.datePublished !== 'string') {
      throw new Error(`Guide ${slug} missing valid 'datePublished'`);
    }

    if (!Array.isArray(doc.sections) || doc.sections.length === 0) {
      throw new Error(`Guide ${slug} must have a non-empty 'sections' array`);
    }

    for (const section of doc.sections) {
      if (!section.id || !section.heading || !Array.isArray(section.paragraphs)) {
        throw new Error(`Guide ${slug} section missing id, heading, or paragraphs array`);
      }
    }

    if (!Array.isArray(doc.citations) || doc.citations.length === 0) {
      throw new Error(`Guide ${slug} must have a non-empty 'citations' array`);
    }

    for (const cit of doc.citations) {
      if (!cit.author || !cit.title || !cit.year) {
        throw new Error(`Guide ${slug} citation missing author, title, or year`);
      }
    }

    if (doc.interactiveCta) {
      if (!doc.interactiveCta.label || !doc.interactiveCta.targetPath || !doc.interactiveCta.referralToken) {
        throw new Error(`Guide ${slug} interactiveCta missing label, targetPath, or referralToken`);
      }
    }
  }

  return true;
}
