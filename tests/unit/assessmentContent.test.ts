import { describe, it, expect } from 'vitest';
import assessmentContent from '../../shared/content/assessmentContent.json';
import { AssessmentContentMap } from '../../shared/types/assessmentContent';
import metadata from '../../shared/seoMetadata.json';
import { ROUTE_REGISTRY } from '../../shared/registries/routeRegistry';

describe('Assessment Content Model & Data Integrity', () => {
  const content = assessmentContent as AssessmentContentMap;
  const canonicalRoutes = [
    '/reaction-test',
    '/direction-test',
    '/colour-recognition',
    '/block-memory',
    '/number-memory'
  ];

  it('contains entries for all five canonical assessment routes', () => {
    for (const route of canonicalRoutes) {
      expect(content[route]).toBeDefined();
      expect(content[route].assessmentId).toBeDefined();
      expect(content[route].title).toBeDefined();
      expect(content[route].subtitle).toBeDefined();
      expect(content[route].sections.length).toBeGreaterThan(0);
      expect(content[route].faq.length).toBeGreaterThan(0);
      expect(content[route].relatedLinks.length).toBeGreaterThan(0);
    }
  });

  it('has valid canonical assessmentIds', () => {
    expect(content['/reaction-test'].assessmentId).toBe('visual-reaction');
    expect(content['/direction-test'].assessmentId).toBe('direction');
    expect(content['/colour-recognition'].assessmentId).toBe('color-recognition');
    expect(content['/block-memory'].assessmentId).toBe('block-memory');
    expect(content['/number-memory'].assessmentId).toBe('number-memory');
  });

  it('enforces link invariant: every article contains at least one real same-site <a href> link to another valid PULSE route', () => {
    const validRoutes = new Set(
      ROUTE_REGISTRY.filter(route => route.seoBehavior.index && !route.isAdministrative).map(route => route.path)
    );
    for (const route of canonicalRoutes) {
      const article = content[route];
      expect(article.relatedLinks.length).toBeGreaterThan(0);
      
      const hasValidInternalLink = article.relatedLinks.some(link => 
        link.path.startsWith('/') && validRoutes.has(link.path) && link.path !== route
      );
      expect(hasValidInternalLink).toBe(true);
    }
  });

  it('contains code-verified technical parameters for /reaction-test without medical or polling rate claims', () => {
    const vrt = content['/reaction-test'];
    const textCorpus = JSON.stringify(vrt);

    // Verified parameters
    expect(textCorpus).toContain('10 trials');
    expect(textCorpus).toContain('80'); // 80ms false start floor
    expect(textCorpus).toContain('display refresh');
    expect(textCorpus).toContain('frame');
    expect(textCorpus).toContain('unadjusted browser-measured stimulus-to-response interval');
    expect(textCorpus).toContain('60 UI updates per second');
    expect(textCorpus).not.toContain('estimated display refresh adjustment');
    expect(textCorpus).not.toContain('accounts for display frame intervals');

    // No unsupported polling rate hardware claims or medical claims
    expect(textCorpus).not.toContain('125Hz');
    expect(textCorpus).not.toContain('1000Hz');
    expect(textCorpus).not.toContain('ADHD');
    expect(textCorpus).not.toContain('diagnostic');
    expect(textCorpus).not.toContain('clinical');
    expect(textCorpus).not.toContain('github.com');
  });

  it('contains code-verified parameters for other tests', () => {
    const direction = content['/direction-test'];
    expect(JSON.stringify(direction)).toContain('10 trials');

    const stroop = content['/colour-recognition'];
    expect(JSON.stringify(stroop)).toContain('15'); // 15 trials

    const block = content['/block-memory'];
    expect(JSON.stringify(block)).toContain('9'); // 9-block grid
    expect(JSON.stringify(block)).toContain('3 lives');

    const number = content['/number-memory'];
    expect(JSON.stringify(number)).toContain('3 lives');
    expect(JSON.stringify(number)).toContain('3 digits');
  });
});
