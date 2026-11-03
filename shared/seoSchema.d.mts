export interface SiteMetadata {
  url: string;
  name: string;
  legalName?: string;
  description: string;
  ogImage: string;
  logo: string;
}

export interface RouteMetadata {
  title: string;
  description: string;
  indexable: boolean;
  clientFallback: boolean;
  lastmod?: string;
  ogImage?: string;
}

export interface SeoMetadata {
  site: SiteMetadata;
  routes: Record<string, RouteMetadata>;
}

export declare function buildHomeSchema(
  metadata: SeoMetadata,
  canonicalUrlOverride?: string
): Record<string, unknown>;

export declare function buildRouteSchema(
  metadata: SeoMetadata,
  pathname: string,
  canonicalUrlOverride?: string,
  guideDoc?: Record<string, unknown>
): Record<string, unknown>;
