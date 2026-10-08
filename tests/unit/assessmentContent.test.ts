import { describe, expect, it } from 'vitest';
import assessmentContent from '../../shared/content/assessmentContent.json';
import { ROUTE_REGISTRY } from '../../shared/registries/routeRegistry';

describe('Assessment SEO content', () => {
  const routes = ['/reaction-test', '/direction-test', '/colour-recognition', '/block-memory', '/number-memory'];

  it('contains unique content for every public assessment route', () => {
    for (const route of routes) {
      const article = (assessmentContent as Record<string, any>)[route];
      expect(article).toBeDefined();
      expect(article.route).toBe(route);
      expect(article.assessmentId).toBeTruthy();
      expect(article.title.length).toBeGreaterThan(10);
      expect(article.sections.length).toBeGreaterThan(2);
      expect(article.faq.length).toBeGreaterThan(0);
      expect(article.relatedLinks.length).toBeGreaterThan(0);
    }

    const titles = routes.map((route) => (assessmentContent as Record<string, any>)[route].title);
    expect(new Set(titles).size).toBe(routes.length);
  });

  it('uses valid registered internal link paths', () => {
    const valid = new Set(ROUTE_REGISTRY.map((route) => route.path));
    for (const route of routes) {
      for (const link of (assessmentContent as Record<string, any>)[route].relatedLinks) {
        expect(valid.has(link.path)).toBe(true);
      }
    }
  });

  it('targets reaction-time search intent without unsupported repo or medical claims', () => {
    const reaction = (assessmentContent as Record<string, any>)['/reaction-test'];
    const text = JSON.stringify(reaction).toLowerCase();
    expect(text).toContain('reaction time');
    expect(text).toContain('visual reaction');
    expect(text).not.toContain('github.com');
    expect(text).not.toContain('open-source');
    expect(text).not.toContain('adhd');
    expect(text).not.toContain('diagnos');
  });
});
