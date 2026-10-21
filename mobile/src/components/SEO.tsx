import { SEO as SharedSEO, type SEOProps } from '../../../src/components/SEO';

export { getCanonicalPath, isProductionHost, isStagingOrTestHost } from '../../../src/components/SEO';

export function SEO(props: SEOProps) {
  return <SharedSEO {...props} includeMobileAlternate={false} />;
}
