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

function relativeFilePathFor(pathname) {
  if (pathname === '/') return 'home.html';
  const clean = pathname.replace(/^\//, '');
  return clean + '.html';
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

// 1. Audit public/robots.txt and public/llms.txt
const robotsTxt = await fs.readFile(path.join(rootDir, 'public', 'robots.txt'), 'utf8');
check(robotsTxt.includes('Disallow: /mobile/'), 'robots.txt must disallow /mobile/ to prevent duplicate indexing');
check(robotsTxt.includes('Sitemap: https://pulse-lab.in/sitemap.xml'), 'robots.txt must declare canonical sitemap');
check(robotsTxt.includes('User-agent: GPTBot') && robotsTxt.includes('User-agent: PerplexityBot'), 'robots.txt must configure explicit AI answer engine rules');

const llmsTxt = await fs.readFile(path.join(rootDir, 'public', 'llms.txt'), 'utf8');
check(llmsTxt.includes('/guides/visual-reaction-time'), 'llms.txt must document visual reaction time guide');
check(llmsTxt.includes('/guides/stroop-effect-speed'), 'llms.txt must document Stroop effect guide');
check(llmsTxt.includes('/benchmarks/cognitive-percentiles'), 'llms.txt must document cognitive percentiles benchmark');

// 2. Audit sitemap.xml
const sitemapXml = await fs.readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
check(sitemapXml.includes('<urlset'), 'sitemap.xml must be valid XML with <urlset>');
check(!sitemapXml.includes('/mobile/'), 'sitemap.xml must not contain mobile URLs');

// 3. Audit each route's generated static shells
for (const [pathname, route] of Object.entries(metadata.routes)) {
  const relativeFile = relativeFilePathFor(pathname);
  const desktopPath = path.join(distDir, 'seo', relativeFile);
  const mobilePath = path.join(distDir, 'seo', 'mobile', relativeFile);

  const desktopHtml = await fs.readFile(desktopPath, 'utf8').catch(() => null);
  const mobileHtml = await fs.readFile(mobilePath, 'utf8').catch(() => null);

  check(desktopHtml !== null, `Desktop static shell must exist for ${pathname}`);
  check(mobileHtml !== null, `Mobile static shell must exist for ${pathname}`);

  if (desktopHtml) {
    check(desktopHtml.includes('<title>'), `Desktop shell for ${pathname} must include <title>`);
    check(desktopHtml.includes('<meta name="description"'), `Desktop shell for ${pathname} must include description meta`);
    check(desktopHtml.includes('<link rel="canonical"'), `Desktop shell for ${pathname} must include canonical link`);
    check(desktopHtml.includes('<meta property="og:image"'), `Desktop shell for ${pathname} must include og:image`);
    check(desktopHtml.includes('<meta name="twitter:card"'), `Desktop shell for ${pathname} must include twitter:card`);
    check(desktopHtml.includes('<script id="pulse-seo-jsonld"'), `Desktop shell for ${pathname} must include JSON-LD script`);

    // Verify JSON-LD parses without errors
    const jsonLdMatch = desktopHtml.match(/<script id="pulse-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        check(Boolean(parsed['@context']), `JSON-LD in ${pathname} must have valid @context`);
      } catch (err) {
        check(false, `JSON-LD in ${pathname} must be valid JSON: ${err.message}`);
      }
    } else {
      check(false, `JSON-LD script tag not found in ${pathname}`);
    }

    if (route.indexable) {
      check(
        desktopHtml.includes('hreflang="x-default"') && desktopHtml.includes('hreflang="en"'),
        `Indexable desktop route ${pathname} must declare hreflang x-default and en alternate tags`
      );
      check(
        desktopHtml.includes('media="only screen and (max-width: 768px)"'),
        `Indexable desktop route ${pathname} must declare mobile alternate link`
      );
    }
  }

  if (mobileHtml) {
    check(mobileHtml.includes('<link rel="canonical" href="https://pulse-lab.in' + (pathname === '/' ? '/' : pathname) + '" />'),
      `Mobile shell for ${pathname} must point canonical directly to desktop URL`
    );
  }
}

console.log(`\nAudit Results: ${passedChecks}/${totalChecks} checks passed.`);

if (failures.length > 0) {
  console.error(`\nFound ${failures.length} audit failures:`);
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: PASS — 100% of all crawler, sitemap, metadata, and schema checks passed.\n');
  process.exit(0);
}
