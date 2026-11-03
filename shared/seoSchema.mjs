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
        slogan: 'Measure Your Mind. Understand Your Potential.',
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
          url: rootCanonical
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

export function buildRouteSchema(metadata, pathname, canonicalUrlOverride, guideDoc) {
  if (pathname === '/') {
    return buildHomeSchema(metadata, canonicalUrlOverride);
  }

  const { site, routes } = metadata;
  const siteRoot = site.url.replace(/\/$/, '');
  const canonicalUrl = canonicalUrlOverride || siteRoot + pathname;
  const route = routes[pathname];

  // Article schema for guide and benchmark pages
  if (guideDoc || pathname.startsWith('/guides/') || pathname.startsWith('/benchmarks/')) {
    const doc = guideDoc || {};
    const headline = doc.title || route?.title || site.name;
    const description = doc.subtitle || route?.description || site.description;
    const datePublished = doc.datePublished || '2026-11-01';
    const dateModified = doc.dateModified || datePublished;

    const citationList = Array.isArray(doc.citations)
      ? doc.citations.map((c) => ({
          '@type': 'CreativeWork',
          name: c.title,
          author: c.author,
          datePublished: String(c.year),
          ...(c.doi ? { identifier: 'doi:' + c.doi, url: 'https://doi.org/' + c.doi } : {})
        }))
      : [];

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          '@id': canonicalUrl + '#article',
          headline,
          description,
          datePublished,
          dateModified,
          mainEntityOfPage: { '@id': canonicalUrl + '#webpage' },
          author: {
            '@type': 'Organization',
            name: 'PULSE Cognitive Research Team',
            url: siteRoot + '/about'
          },
          publisher: {
            '@type': 'Organization',
            name: site.name,
            url: siteRoot + '/',
            logo: {
              '@type': 'ImageObject',
              url: site.logo
            }
          },
          image: site.ogImage,
          ...(citationList.length > 0 ? { citation: citationList } : {}),
          inLanguage: 'en'
        },
        {
          '@type': 'WebPage',
          '@id': canonicalUrl + '#webpage',
          url: canonicalUrl,
          name: headline,
          description,
          isPartOf: { '@id': siteRoot + '/#website' },
          breadcrumb: { '@id': canonicalUrl + '#breadcrumb' },
          inLanguage: 'en'
        },
        {
          '@type': 'BreadcrumbList',
          '@id': canonicalUrl + '#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: siteRoot + '/'
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: pathname.startsWith('/benchmarks') ? 'Benchmarks' : 'Guides',
              item: pathname.startsWith('/benchmarks') ? siteRoot + '/benchmarks/cognitive-percentiles' : siteRoot + '/guides'
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: headline,
              item: canonicalUrl
            }
          ]
        }
      ]
    };
  }

  // Enhanced schema for individual assessment pages
  const isAssessmentRoute =
    pathname.endsWith('-test') ||
    pathname === '/colour-recognition' ||
    pathname === '/block-memory' ||
    pathname === '/number-memory';

  if (isAssessmentRoute) {
    const assessmentName = route?.title?.split('|')[0]?.trim() ?? 'Cognitive Assessment';
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      '@id': canonicalUrl + '#webpage',
      url: canonicalUrl,
      name: route?.title ?? assessmentName + ' | ' + site.name,
      description: route?.description ?? site.description,
      image: site.ogImage,
      isPartOf: { '@id': siteRoot + '/#website' },
      about: { '@id': siteRoot + '/#organization' },
      mainEntity: {
        '@type': 'SoftwareApplication',
        name: assessmentName,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          url: canonicalUrl
        },
        inLanguage: 'en'
      },
      inLanguage: 'en'
    };
  }

  // Specific schema enhancement for Assessment hub
  if (pathname === '/assessments') {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl + '#webpage',
      url: canonicalUrl,
      name: route?.title ?? 'Cognitive Assessments | ' + site.name,
      description: route?.description ?? site.description,
      image: site.ogImage,
      isPartOf: { '@id': siteRoot + '/#website' },
      about: { '@id': siteRoot + '/#organization' },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Visual Reaction Test', url: siteRoot + '/reaction-test' },
          { '@type': 'ListItem', position: 2, name: 'Directional Choice Test', url: siteRoot + '/direction-test' },
          { '@type': 'ListItem', position: 3, name: 'Colour Recognition Test', url: siteRoot + '/colour-recognition' },
          { '@type': 'ListItem', position: 4, name: 'Block Memory Test', url: siteRoot + '/block-memory' },
          { '@type': 'ListItem', position: 5, name: 'Number Memory Test', url: siteRoot + '/number-memory' }
        ]
      },
      inLanguage: 'en'
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': pathname === '/about' ? 'AboutPage' : 'WebPage',
    '@id': canonicalUrl + '#webpage',
    url: canonicalUrl,
    name: route?.title ?? 'Page Not Found | ' + site.name,
    description: route?.description ?? 'The requested page could not be found.',
    image: site.ogImage,
    isPartOf: { '@id': siteRoot + '/#website' },
    about: { '@id': siteRoot + '/#organization' },
    inLanguage: 'en'
  };
}
