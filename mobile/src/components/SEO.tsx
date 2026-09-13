import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
  
  // Strip '/mobile' prefix and clean path for canonical mapping
  const cleanPath = location.pathname.replace(/^\/mobile\/?/, '/');
  const defaultCanonical = `${siteUrl}${cleanPath === '/' ? '' : cleanPath}`;
  const finalCanonical = canonicalUrl || defaultCanonical;

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
    let jsonLdScript = document.getElementById('pulse-seo-jsonld') as HTMLScriptElement;
    if (schema) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'pulse-seo-jsonld';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(schema);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const script = document.getElementById('pulse-seo-jsonld');
      if (script) script.remove();
    };
  }, [title, description, finalCanonical, noindex, ogType, ogImage, schema]);

  return null;
}
