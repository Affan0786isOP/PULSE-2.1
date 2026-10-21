import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import metadata from '../../shared/seoMetadata.json';
import { buildRouteSchema } from '../../shared/seoSchema.mjs';
import { resolveRoute } from '../../shared/registries/routeRegistry';

let nextOwnerId = 0;

export function getCanonicalPath(pathname: string): string {
  let clean = pathname.replace(/^\/mobile(?:\/|$)/, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);

  const route = resolveRoute(clean);
  return route?.canonicalPath ?? route?.path ?? clean;
}

export function isProductionHost(): boolean {
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'pulse-lab.in';
}

export function isStagingOrTestHost(): boolean {
  return !isProductionHost();
}

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
  schema?: Record<string, any>;
  /** Disable the desktop-to-mobile alternate link for the dedicated mobile app. */
  includeMobileAlternate?: boolean;
}

export function SEO({
  title,
  description,
  canonicalUrl,
  noindex,
  ogType = 'website',
  ogImage = metadata.site.ogImage,
  schema,
  includeMobileAlternate = true
}: SEOProps) {
  const location = useLocation();
  const canonicalPath = getCanonicalPath(location.pathname);
  const routeMeta = (metadata.routes as Record<string, {
    title: string;
    description: string;
    indexable: boolean;
  }>)[canonicalPath];

  const isProd = isProductionHost();
  const siteUrl = isProd
    ? metadata.site.url.replace(/\/$/, '')
    : (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin.replace(/\/$/, '')
      : metadata.site.url.replace(/\/$/, ''));

  const finalTitle = title ?? routeMeta?.title ?? 'Page Not Found | PULSE';
  const finalDescription = description ?? routeMeta?.description ?? 'The requested PULSE page could not be found.';
  const defaultCanonical = siteUrl + (canonicalPath === '/' ? '' : canonicalPath);
  const finalCanonical = canonicalUrl || defaultCanonical;
  const effectiveNoindex = !isProd || (noindex ?? (routeMeta ? !routeMeta.indexable : true));

  const schemaMetadata = useMemo(() => ({
    ...metadata,
    site: { ...metadata.site, url: siteUrl }
  }), [siteUrl]);
  const effectiveSchema = useMemo(
    () => schema ?? buildRouteSchema(schemaMetadata, canonicalPath, canonicalUrl ? finalCanonical : undefined),
    [schema, schemaMetadata, canonicalPath, canonicalUrl, finalCanonical]
  );
  const serializedSchema = useMemo(() => JSON.stringify(effectiveSchema), [effectiveSchema]);

  useEffect(() => {
    const upsertMeta = (keyName: 'name' | 'property', attributeValue: string, contentValue: string) => {
      const matches = Array.from(document.querySelectorAll<HTMLMetaElement>(
        `meta[${keyName}="${attributeValue}"]`
      ));
      const element = matches.shift() ?? document.createElement('meta');
      if (!element.isConnected) {
        element.setAttribute(keyName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
      matches.forEach(duplicate => duplicate.remove());
    };

    const upsertLink = (relValue: string, hrefValue: string, extraSelector = '') => {
      const matches = Array.from(document.querySelectorAll<HTMLLinkElement>(
        `link[rel="${relValue}"]${extraSelector}`
      ));
      const element = matches.shift() ?? document.createElement('link');
      if (!element.isConnected) {
        element.setAttribute('rel', relValue);
        if (extraSelector.includes('media=')) {
          element.setAttribute('media', 'only screen and (max-width: 768px)');
        }
        document.head.appendChild(element);
      }
      element.setAttribute('href', hrefValue);
      matches.forEach(duplicate => duplicate.remove());
      return element;
    };

    document.title = finalTitle;
    upsertMeta('name', 'description', finalDescription);
    upsertMeta('name', 'robots', effectiveNoindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertLink('canonical', finalCanonical);

    upsertMeta('property', 'og:title', finalTitle);
    upsertMeta('property', 'og:description', finalDescription);
    upsertMeta('property', 'og:url', finalCanonical);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', metadata.site.name);
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:type', 'image/png');
    upsertMeta('property', 'og:image:alt', 'PULSE cognitive benchmarking');

    const mobileAlternateSelector = '[media="only screen and (max-width: 768px)"]';
    const shouldAdvertiseMobile = includeMobileAlternate && Boolean(routeMeta?.indexable) && !effectiveNoindex;
    if (shouldAdvertiseMobile) {
      const mobilePath = canonicalPath === '/' ? '/mobile/' : '/mobile' + canonicalPath;
      upsertLink('alternate', siteUrl + mobilePath, mobileAlternateSelector);
    } else {
      document.querySelectorAll<HTMLLinkElement>(
        `link[rel="alternate"]${mobileAlternateSelector}`
      ).forEach(link => link.remove());
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', finalTitle);
    upsertMeta('name', 'twitter:description', finalDescription);
    upsertMeta('name', 'twitter:url', finalCanonical);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertMeta('name', 'twitter:image:alt', 'PULSE cognitive benchmarking');

    const currentOwnerId = String(++nextOwnerId);
    let jsonLdScript = document.getElementById('pulse-seo-jsonld') as HTMLScriptElement | null;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'pulse-seo-jsonld';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.setAttribute('data-owner-id', currentOwnerId);
    jsonLdScript.textContent = serializedSchema;

    return () => {
      const script = document.getElementById('pulse-seo-jsonld');
      if (script?.getAttribute('data-owner-id') === currentOwnerId) script.remove();
    };
  }, [
    finalTitle,
    finalDescription,
    finalCanonical,
    effectiveNoindex,
    ogType,
    ogImage,
    serializedSchema,
    includeMobileAlternate,
    routeMeta?.indexable,
    canonicalPath,
    siteUrl
  ]);

  return null;
}
