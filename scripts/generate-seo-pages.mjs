import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
fs.existsSync = existsSync;
import path from 'node:path';
import metadata from '../shared/seoMetadata.json' with { type: 'json' };
import assessmentContent from '../shared/content/assessmentContent.json' with { type: 'json' };
import guidesData from '../shared/content/guides.json' with { type: 'json' };
import { validateGuideContent } from '../shared/content/guideValidator.mjs';
import { buildRouteSchema } from '../shared/seoSchema.mjs';

// Validate guides data before generating
validateGuideContent(guidesData);

const root = process.cwd();
const distDir = process.env.PULSE_SEO_DIST_DIR
  ? path.resolve(process.env.PULSE_SEO_DIST_DIR)
  : path.join(root, 'dist');
const siteUrl = metadata.site.url;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function absoluteUrl(pathname) {
  return siteUrl.replace(/\/$/, '') + (pathname === '/' ? '/' : pathname);
}

function mobilePathFor(pathname) {
  return pathname === '/' ? '/mobile/' : '/mobile' + pathname;
}

const indexedPublicRoutes = Object.entries(metadata.routes)
  .filter(([_, route]) => route.indexable);

const navigationHtml = indexedPublicRoutes
  .map(([pathname, route]) => {
    const label = route.title.replace(/\s*\|\s*PULSE$/, '');
    return '<li><a href="' + escapeHtml(pathname) + '">' + escapeHtml(label) + '</a></li>';
  })
  .join('');

function schemaFor(pathname) {
  const guideDoc = guidesData[pathname];
  return buildRouteSchema(metadata, pathname, undefined, guideDoc);
}

function robotsFor(route) {
  return route.indexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, follow';
}

function relativeFilePathFor(pathname) {
  if (pathname === '/') return 'home.html';
  const clean = pathname.replace(/^\//, '');
  return clean + '.html';
}

function replaceHead(html, pathname, route, isMobile, replaceShell = true) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(absoluteUrl(pathname));
  const robots = escapeHtml(robotsFor(route));
  const ogImage = escapeHtml(route.ogImage ?? metadata.site.ogImage);
  const ogImageAlt = escapeHtml('PULSE cognitive benchmarking');
  const jsonLd = JSON.stringify(schemaFor(pathname)).replaceAll('</', '<\\/');

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>' + title + '</title>')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/<script\s+id=["']pulse-seo-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

  const alternate = '';

  const hreflang = !isMobile && route.indexable
    ? '\n    <link rel="alternate" hreflang="x-default" href="' + canonical + '" />' +
      '\n    <link rel="alternate" hreflang="en" href="' + canonical + '" />'
    : '';

  const headTags =
    '\n    <meta name="description" content="' + description + '" />' +
    '\n    <meta name="robots" content="' + robots + '" />' +
    '\n    <meta property="og:title" content="' + title + '" />' +
    '\n    <meta property="og:description" content="' + description + '" />' +
    '\n    <meta property="og:type" content="website" />' +
    '\n    <meta property="og:url" content="' + canonical + '" />' +
    '\n    <meta property="og:site_name" content="' + escapeHtml(metadata.site.name) + '" />' +
    '\n    <meta property="og:locale" content="en_US" />' +
    '\n    <meta property="og:image" content="' + ogImage + '" />' +
    '\n    <meta property="og:image:alt" content="' + ogImageAlt + '" />' +
    '\n    <meta property="og:image:width" content="1200" />' +
    '\n    <meta property="og:image:height" content="630" />' +
    '\n    <meta property="og:image:type" content="image/png" />' +
    '\n    <meta name="twitter:card" content="summary_large_image" />' +
    '\n    <meta name="twitter:title" content="' + title + '" />' +
    '\n    <meta name="twitter:description" content="' + description + '" />' +
    '\n    <meta name="twitter:url" content="' + canonical + '" />' +
    '\n    <meta name="twitter:image" content="' + ogImage + '" />' +
    '\n    <meta name="twitter:image:alt" content="' + ogImageAlt + '" />' +
    '\n    <link rel="canonical" href="' + canonical + '" />' +
    alternate +
    hreflang +
    '\n    <script id="pulse-seo-jsonld" type="application/ld+json">' + jsonLd + '</script>';

  const closingHeadIndex = output.toLowerCase().indexOf('</head>');
  if (closingHeadIndex < 0) {
    throw new Error('Expected </head> was not found in HTML template for ' + (isMobile ? 'mobile ' : 'desktop ') + pathname);
  }
  output =
    output.slice(0, closingHeadIndex) +
    headTags +
    '\n  </head>' +
    output.slice(closingHeadIndex + '</head>'.length);

  if (!output.includes('<link rel="canonical" href="' + canonical + '" />')) {
    throw new Error('Canonical link was not generated for ' + (isMobile ? 'mobile ' : 'desktop ') + pathname);
  }

  if (!replaceShell) return output;

  const fallbackHeading = escapeHtml(route.title.replace(/\s*\|\s*PULSE$/, ''));
  let innerContentHtml = '';
  const articleData = assessmentContent[pathname];
  const guideDoc = guidesData[pathname];

  if (guideDoc) {
    const sectionsHtml = guideDoc.sections.map(section => {
      const heading = '<h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;color:#f4f7fa">' + escapeHtml(section.heading) + '</h2>';
      const paragraphs = section.paragraphs.map(p => '<p style="margin:0 0 1rem;color:#94a3b8;line-height:1.7">' + escapeHtml(p) + '</p>').join('');
      const list = section.listItems && section.listItems.length > 0
        ? '<ul style="margin:0 0 1.5rem 1.5rem;padding:0;color:#94a3b8;line-height:1.7">' +
          section.listItems.map(item => '<li style="margin-bottom:0.5rem">' + escapeHtml(item) + '</li>').join('') +
          '</ul>'
        : '';
      return '<section id="' + escapeHtml(section.id) + '">' + heading + paragraphs + list + '</section>';
    }).join('');

    const citationsHtml = guideDoc.citations && guideDoc.citations.length > 0
      ? '<section id="citations" style="margin-top:2.5rem;border-top:1px solid #1e293b;padding-top:1.5rem"><h2 style="font-size:1.35rem;margin:0 0 1rem;color:#f4f7fa">Academic References &amp; Citations</h2><ul style="padding-left:1.5rem;color:#94a3b8;line-height:1.7">' +
        guideDoc.citations.map(c =>
          '<li style="margin-bottom:0.5rem">' + escapeHtml(c.author) + ' (' + c.year + '). ' + escapeHtml(c.title) + (c.journal ? '. <em>' + escapeHtml(c.journal) + '</em>' : '') + (c.doi ? ' (DOI: ' + escapeHtml(c.doi) + ')' : '') + '</li>'
        ).join('') +
        '</ul></section>'
      : '';

    const ctaTarget = isMobile && guideDoc.interactiveCta
      ? '/mobile' + guideDoc.interactiveCta.targetPath + '?ref=' + guideDoc.interactiveCta.referralToken
      : (guideDoc.interactiveCta ? guideDoc.interactiveCta.targetPath + '?ref=' + guideDoc.interactiveCta.referralToken : '');

    const ctaHtml = guideDoc.interactiveCta
      ? '<div style="margin:2.5rem 0;padding:1.5rem;background:#11151c;border:1px solid #22c7d6;border-radius:8px;text-align:center">' +
        '<p style="margin:0 0 1rem;font-weight:600;color:#f4f7fa">Ready to evaluate your baseline?</p>' +
        '<a href="' + escapeHtml(ctaTarget) + '" style="display:inline-block;padding:0.75rem 1.5rem;background:#22c7d6;color:#0b0d10;font-weight:600;border-radius:6px;text-decoration:none">' + escapeHtml(guideDoc.interactiveCta.label) + '</a>' +
        '</div>'
      : '';

    innerContentHtml =
      '<article id="assessment-seo-article">' +
      '<header style="margin-bottom:2rem">' +
      '<h1 id="pulse-seo-shell-title" style="font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin:0 0 0.75rem">' + escapeHtml(guideDoc.title) + '</h1>' +
      '<p style="font-size:1.125rem;color:#38bdf8;margin:0 0 1rem">' + escapeHtml(guideDoc.subtitle) + '</p>' +
      '<p style="font-size:0.875rem;color:#64748b;margin:0">Published by PULSE Cognitive Research Team | ' + escapeHtml(guideDoc.datePublished) + '</p>' +
      '</header>' +
      sectionsHtml +
      ctaHtml +
      citationsHtml +
      '</article>';
  } else if (articleData) {
    const sectionsHtml = articleData.sections.map(section => {
      const heading = '<h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;color:#f4f7fa">' + escapeHtml(section.heading) + '</h2>';
      const paragraphs = section.paragraphs.map(p => '<p style="margin:0 0 1rem;color:#94a3b8;line-height:1.7">' + escapeHtml(p) + '</p>').join('');
      const list = section.listItems && section.listItems.length > 0
        ? '<ul style="margin:0 0 1.5rem 1.5rem;padding:0;color:#94a3b8;line-height:1.7">' +
          section.listItems.map(item => '<li style="margin-bottom:0.5rem">' + escapeHtml(item) + '</li>').join('') +
          '</ul>'
        : '';
      return '<section id="' + escapeHtml(section.id) + '">' + heading + paragraphs + list + '</section>';
    }).join('');

    const faqHtml = articleData.faq && articleData.faq.length > 0
      ? '<section id="faq" style="margin-top:2.5rem"><h2 style="font-size:1.5rem;margin:0 0 1rem;color:#f4f7fa">Frequently Asked Questions</h2>' +
        articleData.faq.map(item =>
          '<div style="margin-bottom:1.25rem"><h3 style="font-size:1.15rem;margin:0 0 0.35rem;color:#e2e8f0">' + escapeHtml(item.question) + '</h3><p style="margin:0;color:#94a3b8;line-height:1.7">' + escapeHtml(item.answer) + '</p></div>'
        ).join('') +
        '</section>'
      : '';

    const relatedHtml = articleData.relatedLinks && articleData.relatedLinks.length > 0
      ? '<section id="related-resources" style="margin-top:2.5rem;border-top:1px solid #1e293b;padding-top:1.5rem"><h2 style="font-size:1.35rem;margin:0 0 1rem;color:#f4f7fa">Related Assessments &amp; Resources</h2><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;padding:0;list-style:none;margin:0">' +
        articleData.relatedLinks.map(link =>
          '<li style="background:#11151c;border:1px solid #1e293b;border-radius:6px;padding:1rem"><a href="' + escapeHtml(link.path) + '" style="font-weight:600;color:#22c7d6;text-decoration:none">' + escapeHtml(link.label) + '</a><p style="margin:0.5rem 0 0;font-size:0.875rem;color:#94a3b8;line-height:1.5">' + escapeHtml(link.description) + '</p></li>'
        ).join('') +
        '</ul></section>'
      : '';

    innerContentHtml =
      '<article id="assessment-seo-article">' +
      '<header style="margin-bottom:2rem">' +
      '<h1 id="pulse-seo-shell-title" style="font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin:0 0 0.75rem">' + escapeHtml(articleData.title) + '</h1>' +
      '<p style="font-size:1.125rem;color:#38bdf8;margin:0 0 1rem">' + escapeHtml(articleData.subtitle) + '</p>' +
      '<p style="max-width:68ch;color:#cbd5e1;line-height:1.7">' + description + '</p>' +
      '</header>' +
      sectionsHtml +
      faqHtml +
      relatedHtml +
      '</article>';
  } else {
    innerContentHtml =
      '<h1 id="pulse-seo-shell-title" style="font-size:clamp(2rem,6vw,4rem);line-height:1.05;margin:0 0 1rem">' + fallbackHeading + '</h1>' +
      '<p style="max-width:68ch">' + description + '</p>';
  }

  const fallback = '<main id="pulse-seo-shell" aria-labelledby="pulse-seo-shell-title" style="max-width:960px;margin:0 auto;padding:4rem 1.5rem;font-family:system-ui,sans-serif;color:#f4f7fa;background:#0b0d10;line-height:1.6">' +
    '<p style="margin:0 0 .5rem;font:600 .75rem/1.4 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#22c7d6">PULSE</p>' +
    innerContentHtml +
    '<nav aria-label="PULSE pages" style="margin-top:3rem;border-top:1px solid #1e293b;padding-top:1.5rem"><p style="font-size:0.875rem;color:#64748b;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em">Navigation</p><ul style="display:flex;flex-wrap:wrap;gap:.75rem;padding:0;margin:0;list-style:none">' +
    navigationHtml +
    '</ul></nav>' +
    '</main>';

  const shellRegex = /<main\b[^>]*\bid=["']pulse-seo-shell["'][^>]*>[\s\S]*?<\/main>/i;
  if (!shellRegex.test(output)) {
    throw new Error('Expected <main id="pulse-seo-shell"> was not found in HTML template for ' + (isMobile ? 'mobile ' : 'desktop ') + pathname);
  }

  output = output.replace(shellRegex, fallback);

  return output;
}

async function writeRouteShell(baseHtml, pathname, route, isMobile) {
  const relativeFile = relativeFilePathFor(pathname);
  const relativeDir = isMobile ? path.join('seo', 'mobile') : 'seo';
  const target = path.join(distDir, relativeDir, relativeFile);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, replaceHead(baseHtml, pathname, route, isMobile), 'utf8');
}

async function writeSitemap() {
  const urls = indexedPublicRoutes
    .map(([pathname, route]) => {
      const loc = '    <loc>' + escapeHtml(absoluteUrl(pathname)) + '</loc>';
      const lastmod = route.lastmod ? '\n    <lastmod>' + route.lastmod + '</lastmod>' : '';
      const changefreq = pathname.startsWith('/guides') || pathname.startsWith('/benchmarks')
        ? '\n    <changefreq>monthly</changefreq>'
        : '\n    <priority>0.8</priority>';
      return '  <url>\n' + loc + lastmod + changefreq + '\n  </url>';
    })
    .join('\n');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n';

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
  // Also synchronize public/sitemap.xml for direct dev server & static asset parity
  const publicSitemap = path.join(root, 'public', 'sitemap.xml');
  try {
    await fs.writeFile(publicSitemap, xml, 'utf8');
  } catch (err) {
    console.warn('[SEO] Could not sync public/sitemap.xml:', err.message);
  }
}

const desktopBase = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const mobileBase = await fs.readFile(path.join(distDir, 'mobile', 'index.html'), 'utf8');

// Keep the root entry templates' bodies intact, but generate their SEO heads from
// the same metadata/schema source as direct-route shells.
await fs.writeFile(
  path.join(distDir, 'index.html'),
  replaceHead(desktopBase, '/', metadata.routes['/'], false, false),
  'utf8'
);
await fs.writeFile(
  path.join(distDir, 'mobile', 'index.html'),
  replaceHead(mobileBase, '/', metadata.routes['/'], true, false),
  'utf8'
);

await Promise.all(
  Object.entries(metadata.routes).map(([pathname, route]) =>
    writeRouteShell(desktopBase, pathname, route, false)
  )
);

await Promise.all(
  Object.entries(metadata.routes).map(([pathname, route]) =>
    writeRouteShell(mobileBase, pathname, route, true)
  )
);

await writeSitemap();

async function injectServiceWorkerPrecache(swPath, assetsDir, urlPrefix) {
  try {
    let swContent;
    try {
      swContent = await fs.readFile(swPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`[SW Precache Injection] Skipped for ${swPath}: file does not exist`);
        return;
      }
      throw err;
    }

    if (!fs.existsSync(assetsDir)) {
      console.warn(`[SW Precache Injection] Skipped for ${assetsDir}: directory does not exist`);
      return;
    }

    const assetFiles = await fs.readdir(assetsDir);
    // 1. Critical entry assets (index-*.js and index-*.css)
    const entryAssets = assetFiles
      .filter((file) => /^index-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(file))
      .map((file) => `${urlPrefix}${file}`);

    // 2. Key assessment and guide route assets (cached non-fatally to ensure offline readiness)
    const keyRouteAssets = assetFiles
      .filter((file) => /^(?:ReactionTest|DirectionTest|ColorTest|BlockMemoryTest|NumberMemoryTest|Assessments|GuidePage|GuidesHub|guides)-[A-Za-z0-9_-]{8,}\.js$/.test(file))
      .map((file) => `${urlPrefix}${file}`);

    if (entryAssets.length === 0) {
      throw new Error(`Zero entry hashed assets found in ${assetsDir} for precache injection`);
    }

    const replacement = `/* __BUILD_INJECT_ASSETS_START__ */\nconst BUILD_ENTRY_ASSETS = ${JSON.stringify(entryAssets, null, 2)};\nconst BUILD_KEY_ROUTE_ASSETS = ${JSON.stringify(keyRouteAssets, null, 2)};\n/* __BUILD_INJECT_ASSETS_END__ */`;
    const updated = swContent.replace(/\/\* __BUILD_INJECT_ASSETS_START__ \*\/[\s\S]*?\/\* __BUILD_INJECT_ASSETS_END__ \*\//, replacement);
    await fs.writeFile(swPath, updated, 'utf8');
  } catch (err) {
    console.error(`[SW Precache Injection] Failed for ${swPath}:`, err.message);
    throw err;
  }
}

// Inject hashed entry assets into built service workers
await injectServiceWorkerPrecache(
  path.join(distDir, 'sw.js'),
  path.join(distDir, 'assets'),
  '/assets/'
);
await injectServiceWorkerPrecache(
  path.join(distDir, 'mobile', 'sw.js'),
  path.join(distDir, 'mobile', 'assets'),
  '/mobile/assets/'
);
// Generate markdown documents for agents (Content negotiation Accept: text/markdown)
async function generateMarkdownForAgents() {
  const mdDist = path.join(distDir, 'md');
  const mdPublic = path.join(root, 'public', 'md');
  await fs.mkdir(mdDist, { recursive: true });
  await fs.mkdir(mdPublic, { recursive: true });

  for (const [pathname, route] of indexedPublicRoutes) {
    const slug = pathname === '/' ? 'home' : pathname.replace(/^\//, '').replace(/\//g, '-');
    const guideDoc = guidesData[pathname];
    const articleData = assessmentContent[pathname];

    let contentMd = `# ${route.title.replace(/\s*\|\s*PULSE$/, '')}\n\n`;
    contentMd += `> Canonical URL: ${absoluteUrl(pathname)}\n`;
    contentMd += `> Description: ${route.description}\n`;
    contentMd += `> Publisher: PULSE Cognitive Research Team\n`;
    contentMd += `> Content Signals: search=yes, ai-input=yes, ai-train=no\n\n`;

    if (guideDoc) {
      contentMd += `## ${guideDoc.subtitle}\n\n`;
      contentMd += `*Published: ${guideDoc.datePublished}*\n\n`;
      for (const section of guideDoc.sections) {
        contentMd += `### ${section.heading}\n\n`;
        for (const p of section.paragraphs) {
          contentMd += `${p}\n\n`;
        }
        if (section.listItems && section.listItems.length > 0) {
          for (const item of section.listItems) {
            contentMd += `- ${item}\n`;
          }
          contentMd += '\n';
        }
      }
      if (guideDoc.citations && guideDoc.citations.length > 0) {
        contentMd += `### Academic Citations & References\n\n`;
        for (const c of guideDoc.citations) {
          contentMd += `- ${c.author} (${c.year}). *${c.title}*${c.journal ? `. ${c.journal}` : ''}${c.doi ? ` [DOI: ${c.doi}](https://doi.org/${c.doi})` : ''}\n`;
        }
        contentMd += '\n';
      }
    } else if (articleData) {
      contentMd += `## ${articleData.subtitle}\n\n`;
      for (const section of articleData.sections) {
        contentMd += `### ${section.heading}\n\n`;
        for (const p of section.paragraphs) {
          contentMd += `${p}\n\n`;
        }
        if (section.listItems && section.listItems.length > 0) {
          for (const item of section.listItems) {
            contentMd += `- ${item}\n`;
          }
          contentMd += '\n';
        }
      }
      if (articleData.faq && articleData.faq.length > 0) {
        contentMd += `### Frequently Asked Questions\n\n`;
        for (const f of articleData.faq) {
          contentMd += `#### ${f.question}\n\n${f.answer}\n\n`;
        }
      }
    } else {
      contentMd += `${route.description}\n\n`;
    }

    contentMd += `---\n\n*Machine discovery: This document is served automatically when requesting with \`Accept: text/markdown\`. For global project documentation see [llms.txt](https://pulse-lab.in/llms.txt).*`;

    const distPath = path.join(mdDist, `${slug}.md`);
    const pubPath = path.join(mdPublic, `${slug}.md`);
    await fs.writeFile(distPath, contentMd, 'utf8');
    await fs.writeFile(pubPath, contentMd, 'utf8');
  }
}

await generateMarkdownForAgents();

console.log('Successfully generated all SEO shells, sitemap, and agent markdown documents.');
