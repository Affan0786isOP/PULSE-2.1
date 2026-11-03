import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import assessmentContent from '../../shared/content/assessmentContent.json';
import metadata from '../../shared/seoMetadata.json';
import { buildRouteSchema } from '../../shared/seoSchema.mjs';

describe('PULSE 35-Skill SEO Taxonomy & Verification', () => {
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

    // Tests
    expect(content).toContain('/reaction-test');
    expect(content).toContain('/direction-test');
    expect(content).toContain('/colour-recognition');
    expect(content).toContain('/block-memory');
    expect(content).toContain('/number-memory');

    // Guides & Benchmarks
    expect(content).toContain('/guides/visual-reaction-time');
    expect(content).toContain('/guides/stroop-effect-speed');
    expect(content).toContain('/benchmarks/cognitive-percentiles');

    // Methodological facts
    expect(content).toContain('80.0ms');
    expect(content).toContain('refresh rate');
  });

  it('configures explicit AI search crawler rules in robots.txt', () => {
    const robotsPath = path.resolve(__dirname, '../../public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf8');

    expect(content).toContain('User-agent: GPTBot');
    expect(content).toContain('User-agent: PerplexityBot');
    expect(content).toContain('User-agent: ClaudeBot');
    expect(content).toContain('Disallow: /mobile/');
    expect(content).toContain('Sitemap: https://pulse-lab.in/sitemap.xml');
  });

  it('includes scientific differentiation context in visual reaction test content', () => {
    const reactionContent = (assessmentContent as Record<string, any>)['/reaction-test'];
    expect(reactionContent).toBeDefined();

    const diffSection = reactionContent.sections.find(
      (s: any) => s.id === 'pulse-vs-conventional-tests'
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
    const articleNode = (guideSchema as any)['@graph'].find((n: any) => n['@type'] === 'Article');
    expect(articleNode).toBeDefined();
    expect(articleNode.headline).toContain('Visual Reaction Time');
  });
});
