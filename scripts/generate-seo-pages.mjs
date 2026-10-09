import fs from 'node:fs/promises';
import path from 'node:path';
import metadata from '../shared/seoMetadata.json' with { type: 'json' };
import assessmentContent from '../shared/content/assessmentContent.json' with { type: 'json' };

const root = process.cwd();
const distDir = path.join(root, 'dist');
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
  return siteUrl + (pathname === '/' ? '' : pathname);
}

function mobilePathFor(pathname) {
  return pathname === '/' ? '/mobile/' : '/mobile' + pathname;
}

const indexedPublicRoutes = Object.entries(metadata.routes)
  .filter(([pathname, route]) => route.indexable && !pathname.startsWith('/admin'));

const navigationHtml = indexedPublicRoutes
  .map(([pathname, route]) => {
    const label = route.title.replace(/\s*\|\s*PULSE$/, '');
    return '<li><a href="' + escapeHtml(pathname) + '">' + escapeHtml(label) + '</a></li>';
  })
  .join('');

const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': siteUrl + '/#website',
      'url': siteUrl + '/',
      'name': metadata.site.name,
      'alternateName': metadata.site.legalName,
      'description': metadata.site.description,
      'inLanguage': 'en'
    },
    {
      '@type': 'Organization',
      '@id': siteUrl + '/#organization',
      'name': metadata.site.name,
      'alternateName': metadata.site.legalName,
      'url': siteUrl + '/',
      'logo': {
        '@type': 'ImageObject',
        'url': metadata.site.logo,
        'width': 512,
        'height': 512
      }
    },
    {
      '@type': 'SoftwareApplication',
      '@id': siteUrl + '/#software',
      'name': metadata.site.name,
      'description': metadata.site.description,
      'url': siteUrl + '/',
      'applicationCategory': 'EducationalApplication',
      'operatingSystem': 'Web',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
        'url': siteUrl + '/'
      },
      'featureList': [
        'Visual Reaction Test',
        'Directional Choice Test',
        'Colour Recognition Test',
        'Block Memory Test',
        'Number Memory Test'
      ]
    },
    {
      '@type': 'WebPage',
      '@id': siteUrl + '/#webpage',
      'url': siteUrl + '/',
      'name': metadata.routes['/'].title,
      'description': metadata.routes['/'].description,
      'image': metadata.site.ogImage,
      'isPartOf': { '@id': siteUrl + '/#website' },
      'about': { '@id': siteUrl + '/#organization' },
      'inLanguage': 'en'
    }
  ]
};

function schemaFor(pathname, route) {
  if (pathname === '/') return homeSchema;

  const canonical = absoluteUrl(pathname);
  const type = pathname === '/about' ? 'AboutPage' : 'WebPage';
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': canonical + '#webpage',
    'url': canonical,
    'name': route.title,
    'description': route.description,
    'image': metadata.site.ogImage,
    'isPartOf': { '@id': siteUrl + '/#website' },
    'about': { '@id': siteUrl + '/#organization' },
    'inLanguage': 'en'
  };
}

function robotsFor(route) {
  return route.indexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, follow';
}

function slugFor(pathname) {
  return pathname === '/' ? 'home' : pathname.replace(/^\//, '').replaceAll('/', '--');
}

function replaceHead(html, pathname, route, isMobile) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(absoluteUrl(pathname));
  const robots = escapeHtml(robotsFor(route));
  const ogImage = escapeHtml(metadata.site.ogImage);
  const ogImageAlt = escapeHtml('PULSE cognitive benchmarking');
  const jsonLd = JSON.stringify(schemaFor(pathname, route)).replaceAll('</', '<\\/');

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>' + title + '</title>')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/<script\s+id=["']pulse-seo-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

  const alternate = !isMobile
    ? '\n    <link rel="alternate" media="only screen and (max-width: 768px)" href="' +
      escapeHtml(absoluteUrl(mobilePathFor(pathname))) +
      '" />'
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
    '\n    <script id="pulse-seo-jsonld" type="application/ld+json">' + jsonLd + '</script>';

  output = output.replace(/<\/head>/i, headTags + '\n  </head>');

  const fallbackHeading = escapeHtml(route.title.replace(/\s*\|\s*PULSE$/, ''));
  let innerContentHtml = '';
  const articleData = assessmentContent[pathname];

  if (articleData) {
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
  const relativeDir = isMobile ? path.join('seo', 'mobile') : 'seo';
  const target = path.join(distDir, relativeDir, slugFor(pathname) + '.html');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, replaceHead(baseHtml, pathname, route, isMobile), 'utf8');
}

async function writeSitemap() {
  const urls = indexedPublicRoutes
    .map(([pathname]) => '  <url><loc>' + escapeHtml(absoluteUrl(pathname)) + '</loc></url>')
    .join('\n');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n';

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
}

const desktopBase = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const mobileBase = await fs.readFile(path.join(distDir, 'mobile', 'index.html'), 'utf8');

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
