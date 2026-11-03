import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import assessmentContent from '../../shared/content/assessmentContent.json';
import metadata from '../../shared/seoMetadata.json';
import { buildRouteSchema } from '../../shared/seoSchema.mjs';

function parseRobotsGroups(content: string) {
  const groups: Array<{ agents: string[]; directives: Array<{ name: string; value: string }> }> = [];
  let current: (typeof groups)[number] | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const userAgentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (userAgentMatch) {
      if (!current || current.directives.length > 0) {
        current = { agents: [], directives: [] };
        groups.push(current);
      }
      current.agents.push(userAgentMatch[1].trim().toLowerCase());
      continue;
    }

    const directiveMatch = line.match(/^([a-z-]+):\s*(.*)$/i);
    if (directiveMatch && current) {
      current.directives.push({
        name: directiveMatch[1].toLowerCase(),
        value: directiveMatch[2].trim()
      });
    }
  }

  return groups;
}

describe('PULSE SEO crawler policy and taxonomy', () => {
  it('has an active and matching IndexNow key in public directory', () => {
    const keyFilePath = path.resolve(__dirname, '../../public/425e11679eaa4998a863c5fc45cfbcc1.txt');
    expect(fs.existsSync(keyFilePath)).toBe(true);
    const key = fs.readFileSync(keyFilePath, 'utf8').trim();
    expect(key).toBe('425e11679eaa4998a863c5fc45cfbcc1');
  });

  it('provides comprehensive llms.txt documenting all tests, guides, and timing metrics', () => {
    const llmsPath = path.resolve(__dirname, '../../public/llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const content = fs.readFileSync(llmsPath, 'utf8');

    for (const route of [
      '/reaction-test',
      '/direction-test',
      '/colour-recognition',
      '/block-memory',
      '/number-memory',
      '/guides/visual-reaction-time',
      '/guides/stroop-effect-speed',
      '/benchmarks/cognitive-percentiles'
    ]) {
      expect(content).toContain(route);
    }

    expect(content).toContain('80.0ms');
    expect(content).toContain('refresh rate');
  });

  it('separates AI search/retrieval crawlers from model-training crawlers', () => {
    const robotsPath = path.resolve(__dirname, '../../public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const groups = parseRobotsGroups(fs.readFileSync(robotsPath, 'utf8'));

    const groupFor = (agent: string) =>
      groups.find(group => group.agents.includes(agent.toLowerCase()));

    const has = (agent: string, name: string, value: string) =>
      Boolean(groupFor(agent)?.directives.some(directive =>
        directive.name === name.toLowerCase() && directive.value === value
      ));

    for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User']) {
      expect(groupFor(agent), agent + ' must have an explicit robots group').toBeDefined();
      expect(has(agent, 'allow', '/'), agent + ' must be allowed on public pages').toBe(true);

      for (const privatePath of ['/admin', '/admin/', '/api', '/api/', '/seo/', '/mobile/']) {
        expect(has(agent, 'disallow', privatePath), agent + ' must be blocked from ' + privatePath).toBe(true);
      }
    }

    for (const agent of ['GPTBot', 'ClaudeBot', 'Applebot-Extended', 'Google-Extended']) {
      expect(groupFor(agent), agent + ' must have an explicit robots group').toBeDefined();
      expect(has(agent, 'disallow', '/'), agent + ' must be excluded from model training').toBe(true);
    }

    const wildcard = groupFor('*');
    expect(has('*', 'allow', '/')).toBe(true);
    for (const privatePath of ['/admin', '/admin/', '/api', '/api/', '/seo/', '/mobile/']) {
      expect(wildcard?.directives.some(directive =>
        directive.name === 'disallow' && directive.value === privatePath
      )).toBe(true);
    }

    // Google-Extended also controls Gemini grounding; its exclusion is deliberate
    // under ai-train=no and does not block ordinary Googlebot indexing.
    expect(has('Google-Extended', 'disallow', '/')).toBe(true);

    expect(fs.readFileSync(robotsPath, 'utf8')).toContain('Sitemap: https://pulse-lab.in/sitemap.xml');
  });

  it('keeps the checked-in sitemap synchronized with indexable canonical routes', () => {
    const sitemapPath = path.resolve(__dirname, '../../public/sitemap.xml');
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);
    const expected = Object.entries(metadata.routes)
      .filter(([, route]) => route.indexable)
      .map(([pathname]) => metadata.site.url + (pathname === '/' ? '/' : pathname));

    expect(urls).toEqual(expected);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('includes scientific differentiation context in visual reaction test content', () => {
    const reactionContent = (assessmentContent as Record<string, any>)['/reaction-test'];
    expect(reactionContent).toBeDefined();

    const diffSection = reactionContent.sections.find(
      (section: any) => section.id === 'pulse-vs-conventional-tests'
    );
    expect(diffSection).toBeDefined();
    expect(diffSection.heading).toContain('How PULSE Differs');
    expect(diffSection.paragraphs[0]).toContain('Human Benchmark');
  });

  it('builds valid schema graphs with Article, ItemPage, and WebPage', () => {
    const reactionSchema = buildRouteSchema(metadata as any, '/reaction-test');
    expect(reactionSchema['@type']).toBe('ItemPage');
    expect((reactionSchema as any).datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((reactionSchema as any).dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const guideSchema = buildRouteSchema(metadata as any, '/guides/visual-reaction-time');
    expect((guideSchema as any)['@graph']).toBeDefined();
    const articleNode = (guideSchema as any)['@graph'].find((node: any) => node['@type'] === 'Article');
    expect(articleNode).toBeDefined();
    expect(articleNode.headline).toContain('Visual Reaction Time');
  });
});
