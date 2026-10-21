export function buildHomeSchema(metadata, canonicalUrlOverride) {
  const { site, routes } = metadata;
  const homeUrl = site.url.replace(/\/$/, '');
  const rootCanonical = canonicalUrlOverride || homeUrl + '/';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': homeUrl + '/#website',
        url: rootCanonical,
        name: site.name,
        alternateName: site.legalName,
        description: site.description,
        inLanguage: 'en'
      },
      {
        '@type': 'Organization',
        '@id': homeUrl + '/#organization',
        name: site.name,
        alternateName: site.legalName,
        url: rootCanonical,
        logo: {
          '@type': 'ImageObject',
          url: site.logo,
          width: 512,
          height: 512
        }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': homeUrl + '/#software',
        name: site.name,
        description: site.description,
        url: rootCanonical,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          url: homeUrl + '/'
        },
        featureList: [
          'Visual Reaction Test',
          'Directional Choice Test',
          'Colour Recognition Test',
          'Block Memory Test',
          'Number Memory Test'
        ],
        inLanguage: 'en'
      },
      {
        '@type': 'WebPage',
        '@id': homeUrl + '/#webpage',
        url: rootCanonical,
        name: routes['/']?.title ?? site.name,
        description: routes['/']?.description ?? site.description,
        image: site.ogImage,
        isPartOf: { '@id': homeUrl + '/#website' },
        about: { '@id': homeUrl + '/#organization' },
        inLanguage: 'en'
      }
    ]
  };
}

export function buildRouteSchema(metadata, pathname, canonicalUrlOverride) {
  if (pathname === '/') return buildHomeSchema(metadata, canonicalUrlOverride);

  const { site, routes } = metadata;
  const canonicalUrl = canonicalUrlOverride || site.url.replace(/\/$/, '') + pathname;
  const route = routes[pathname];
  return {
    '@context': 'https://schema.org',
    '@type': pathname === '/about' ? 'AboutPage' : 'WebPage',
    '@id': canonicalUrl + '#webpage',
    url: canonicalUrl,
    name: route?.title ?? 'Page Not Found | ' + site.name,
    description: route?.description ?? 'The requested page could not be found.',
    image: site.ogImage,
    isPartOf: { '@id': site.url.replace(/\/$/, '') + '/#website' },
    about: { '@id': site.url.replace(/\/$/, '') + '/#organization' },
    inLanguage: 'en'
  };
}
