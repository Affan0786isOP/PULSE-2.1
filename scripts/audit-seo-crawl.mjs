#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const metadataPath = path.join(rootDir, 'shared', 'seoMetadata.json');
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
const siteUrl = metadata.site.url.replace(/\/$/, '');

function relativeFilePathFor(pathname) {
  if (pathname === '/') return 'home.html';
  return pathname.replace(/^\//, '') + '.html';
}

function parseRobotsGroups(content) {
  const groups = [];
  let current = null;

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

function groupFor(groups, agent) {
  const normalized = agent.toLowerCase();
  return groups.find(group => group.agents.includes(normalized)) ?? null;
}

function hasDirective(group, name, value) {
  return Boolean(group?.directives.some(directive =>
    directive.name === name.toLowerCase() && directive.value === value
  ));
}

console.log('=====================================================');
console.log(' PULSE SEO CRAWLER SIMULATION & INTEGRITY AUDITOR    ');
console.log('=====================================================\n');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function check(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
  } else {
    failures.push(message);
    console.error(`  [FAIL] ${message}`);
  }
}

function checkPublicCrawler(groups, agent) {
  const group = groupFor(groups, agent);
  check(Boolean(group), `${agent} must have an explicit robots.txt group`);
  check(hasDirective(group, 'allow', '/'), `${agent} must be allowed to crawl public pages`);

  for (const privatePath of ['/admin', '/admin/', '/api', '/api/', '/seo/', '/mobile/']) {
    check(
      hasDirective(group, 'disallow', privatePath),
      `${agent} must be blocked from ${privatePath}`
    );
  }
}

function checkTrainingCrawlerBlocked(groups, agent) {
  const group = groupFor(groups, agent);
  check(Boolean(group), `${agent} must have an explicit robots.txt group`);
  check(
    hasDirective(group, 'disallow', '/'),
    `${agent} must be blocked from the entire site under the ai-train=no policy`
  );
}

// 1. Audit robots.txt crawler policy and llms.txt coverage.
const robotsTxt = await fs.readFile(path.join(rootDir, 'public', 'robots.txt'), 'utf8');
const robotsGroups = parseRobotsGroups(robotsTxt);
const wildcardGroup = groupFor(robotsGroups, '*');

check(Boolean(wildcardGroup), 'robots.txt must contain a default User-agent: * group');
check(hasDirective(wildcardGroup, 'allow', '/'), 'default crawlers must be allowed to access public pages');

for (const privatePath of ['/admin', '/admin/', '/api', '/api/', '/seo/', '/mobile/']) {
  check(
    hasDirective(wildcardGroup, 'disallow', privatePath),
    `default crawlers must be blocked from ${privatePath}`
  );
}

for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User']) {
  checkPublicCrawler(robotsGroups, agent);
}

for (const agent of ['GPTBot', 'ClaudeBot', 'Applebot-Extended', 'Google-Extended']) {
  checkTrainingCrawlerBlocked(robotsGroups, agent);
}

check(
  robotsTxt.includes('Sitemap: ' + siteUrl + '/sitemap.xml'),
  'robots.txt must declare the canonical sitemap URL'
);

const llmsTxt = await fs.readFile(path.join(rootDir, 'public', 'llms.txt'), 'utf8');
check(llmsTxt.includes('/guides/visual-reaction-time'), 'llms.txt must document visual reaction time guide');
check(llmsTxt.includes('/guides/stroop-effect-speed'), 'llms.txt must document Stroop effect guide');
check(llmsTxt.includes('/benchmarks/cognitive-percentiles'), 'llms.txt must document cognitive percentiles benchmark');

// 2. Audit sitemap completeness, uniqueness, and indexability.
const sitemapXml = await fs.readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
check(sitemapXml.includes('<urlset'), 'generated sitemap must contain a urlset');
check(sitemapXml.includes('</urlset>'), 'generated sitemap must close its urlset');

const sitemapUrls = Array.from(
  sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g),
  match => match[1].trim()
);
const expectedUrls = Object.entries(metadata.routes)
  .filter(([, route]) => route.indexable)
  .map(([pathname]) => siteUrl + (pathname === '/' ? '/' : pathname));

check(
  sitemapUrls.length === expectedUrls.length,
  `sitemap must contain exactly ${expectedUrls.length} indexable URLs (found ${sitemapUrls.length})`
);
check(
  new Set(sitemapUrls).size === sitemapUrls.length,
  'sitemap must not contain duplicate URLs'
);
check(
  JSON.stringify(sitemapUrls) === JSON.stringify(expectedUrls),
  'sitemap URLs and ordering must exactly match the indexable SEO route registry'
);
check(
  !sitemapUrls.some(url => /\/mobile(?:\/|$)|\/seo(?:\/|$)/.test(new URL(url).pathname)),
  'sitemap must not contain mobile or internal SEO-shell URLs'
);
check(
  !sitemapUrls.includes(siteUrl + '/dataset'),
  'non-indexable dataset route must not appear in sitemap'
);

// 3. Audit prerendered route shells and their metadata/schema.
for (const [pathname, route] of Object.entries(metadata.routes)) {
  const relativeFile = relativeFilePathFor(pathname);
  const desktopPath = path.join(distDir, 'seo', relativeFile);
  const mobilePath = path.join(distDir, 'seo', 'mobile', relativeFile);

  const desktopHtml = await fs.readFile(desktopPath, 'utf8').catch(() => null);
  const mobileHtml = await fs.readFile(mobilePath, 'utf8').catch(() => null);

  check(desktopHtml !== null, `Desktop static shell must exist for ${pathname}`);
  check(mobileHtml !== null, `Existing mobile static shell must remain buildable for ${pathname}`);

  if (desktopHtml) {
    check(desktopHtml.includes('<title>'), `Desktop shell for ${pathname} must include <title>`);
    check(desktopHtml.includes('<meta name="description"'), `Desktop shell for ${pathname} must include description meta`);
    check(desktopHtml.includes('<link rel="canonical"'), `Desktop shell for ${pathname} must include canonical link`);
    check(desktopHtml.includes('<meta name="robots"'), `Desktop shell for ${pathname} must include robots meta`);
    check(desktopHtml.includes('<meta property="og:image"'), `Desktop shell for ${pathname} must include og:image`);
    check(desktopHtml.includes('<meta name="twitter:card"'), `Desktop shell for ${pathname} must include twitter:card`);
    check(desktopHtml.includes('<script id="pulse-seo-jsonld"'), `Desktop shell for ${pathname} must include JSON-LD script`);

    const expectedCanonical = siteUrl + (pathname === '/' ? '/' : pathname);
    check(
      desktopHtml.includes('<link rel="canonical" href="' + expectedCanonical + '" />'),
      `Desktop shell for ${pathname} must point to its exact canonical URL`
    );

    const jsonLdMatch = desktopHtml.match(/<script id="pulse-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        check(Boolean(parsed['@context']), `JSON-LD in ${pathname} must have a valid @context`);
      } catch (err) {
        check(false, `JSON-LD in ${pathname} must be valid JSON: ${err.message}`);
      }
    } else {
      check(false, `JSON-LD script tag not found in ${pathname}`);
    }

    if (route.indexable) {
      check(
        desktopHtml.includes('content="index, follow'),
        `Indexable desktop route ${pathname} must not be noindex`
      );
      check(
        desktopHtml.includes('hreflang="x-default"') && desktopHtml.includes('hreflang="en"'),
        `Indexable desktop route ${pathname} must declare its existing language alternates`
      );
    } else {
      check(
        desktopHtml.includes('content="noindex, follow"'),
        `Non-indexable desktop route ${pathname} must declare noindex, follow`
      );
    }
  }

  if (mobileHtml) {
    const expectedCanonical = siteUrl + (pathname === '/' ? '/' : pathname);
    check(
      mobileHtml.includes('<link rel="canonical" href="' + expectedCanonical + '" />'),
      `Existing mobile shell for ${pathname} must point to its canonical URL`
    );
  }
}

console.log(`\nAudit Results: ${passedChecks}/${totalChecks} checks passed.`);

if (failures.length > 0) {
  console.error(`\nFound ${failures.length} audit failures:`);
  failures.forEach(failure => console.error(`  - ${failure}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: PASS — crawler policy, sitemap, metadata, and schema checks passed.\n');
  process.exit(0);
}
