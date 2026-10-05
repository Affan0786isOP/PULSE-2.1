import { SEO, getCanonicalPath } from './SEO';
import { useLocation } from 'react-router-dom';
import metadata from '../../../shared/seoMetadata.json';

const SITE_URL = metadata.site.url;

function getAbsoluteCanonical(pathname: string): string {
  const canonicalPath = getCanonicalPath(pathname);
  const base = SITE_URL;
  return base + (canonicalPath === '/' ? '' : canonicalPath);
}

type RouteMetadata = {
  title: string;
  description: string;
  indexable: boolean;
  clientFallback: boolean;
};

export function RouteSEO() {
  const location = useLocation();
  const canonicalPath = getCanonicalPath(location.pathname);
  const route = (metadata.routes as Record<string, RouteMetadata>)[canonicalPath];

  if (!route) {
    return (
      <SEO
        title="Page Not Found | PULSE"
        description="The requested PULSE page could not be found."
        noindex
      />
    );
  }

  if (!route.clientFallback) {
    return null;
  }

  const expectedCanonical = getAbsoluteCanonical(location.pathname);
  const currentCanonical =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? ''
      : '';

  if (currentCanonical === expectedCanonical) {
    return null;
  }

  return (
    <SEO
      title={route.title}
      description={route.description}
      canonicalUrl={expectedCanonical}
      noindex={!route.indexable}
    />
  );
}
