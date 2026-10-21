export interface SeoMetadata {
  site: {
    url: string;
    name: string;
    legalName: string;
    description: string;
    ogImage: string;
    logo: string;
  };
  routes: Record<string, {
    title: string;
    description: string;
    indexable: boolean;
    clientFallback?: boolean;
  }>;
}
export function buildHomeSchema(metadata: SeoMetadata, canonicalUrlOverride?: string): Record<string, any>;
export function buildRouteSchema(metadata: SeoMetadata, pathname: string, canonicalUrlOverride?: string): Record<string, any>;
