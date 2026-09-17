import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

let nextOwnerId = 0;

export function getCanonicalPath(pathname: string): string {
  let clean = pathname.replace(/^\/mobile(?:\/|$)/, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  switch (clean) {
    case '/visual-reaction':
      return '/reaction-test';
    case '/direction':
      return '/direction-test';
    case '/color-recognition':
    case '/color-test':
      return '/colour-recognition';
    case '/block-memory-test':
      return '/block-memory';
    case '/number-memory-test':
      return '/number-memory';
    case '/research-privacy':
    case '/privacy-policy':
      return '/privacy';
    case '/analytics':
      return '/dataset';
    default:
      return clean;
  }
}

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
  schema?: Record<string, any>;
}

export function SEO({
  title,
  description,
  canonicalUrl,
  noindex = false,
  ogType = 'website',
  ogImage = 'https://pulse-lab.in/logo.png',
  schema
}: SEOProps) {
  const location = useLocation();

  // Mobile URLs canonicalize to their corresponding desktop versions
  const siteUrl = 'https://pulse-lab.in';
  const canonicalPath = getCanonicalPath(location.pathname);
  const defaultCanonical = `${siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
  const finalCanonical = canonicalUrl || defaultCanonical;

  // Memoize serialized schema string to avoid unnecessary effect triggers when schema object is recreated on render
  const serializedSchema = useMemo(() => {
    return schema ? JSON.stringify(schema) : '';
  }, [schema]);

  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to update or create meta tags
    const updateMetaTag = (attributeName: string, attributeValue: string, contentValue: string, keyName = 'name') => {
      let element = document.querySelector(`meta[${keyName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(keyName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    // Helper to update or create link tags
    const updateLinkTag = (relValue: string, hrefValue: string) => {
      let element = document.querySelector(`link[rel="${relValue}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', relValue);
        document.head.appendChild(element);
      }
      element.setAttribute('href', hrefValue);
    };

    // 2. Update Meta Description
    updateMetaTag('name', 'description', description);

    // 3. Update Canonical URL
    updateLinkTag('canonical', finalCanonical);

    // 4. Update Robots Tag
    updateMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // 5. Open Graph Meta Tags
    updateMetaTag('property', 'og:title', title, 'property');
    updateMetaTag('property', 'og:description', description, 'property');
    updateMetaTag('property', 'og:url', finalCanonical, 'property');
    updateMetaTag('property', 'og:type', ogType, 'property');
    updateMetaTag('property', 'og:site_name', 'PULSE', 'property');
    updateMetaTag('property', 'og:image', ogImage, 'property');

    // 6. Twitter Meta Tags
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', ogImage);

    // 7. Structured Data (JSON-LD)
    const currentOwnerId = String(++nextOwnerId);
    let jsonLdScript = document.getElementById('pulse-seo-jsonld') as HTMLScriptElement;
    if (serializedSchema) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'pulse-seo-jsonld';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.setAttribute('data-owner-id', currentOwnerId);
      jsonLdScript.textContent = serializedSchema;
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount only if this effect is still the owner
      const script = document.getElementById('pulse-seo-jsonld');
      if (script && script.getAttribute('data-owner-id') === currentOwnerId) {
        script.remove();
      }
    };
  }, [title, description, finalCanonical, noindex, ogType, ogImage, serializedSchema]);

  return null;
}
