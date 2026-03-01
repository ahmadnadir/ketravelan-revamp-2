import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ketravelan.com';

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ketravelan',
    url: SITE_URL,
    logo: `${SITE_URL}/pwa-512x512.png`,
    description: 'Find travel buddies and join group trips. Plan trips with friends, not spreadsheets.',
    sameAs: [],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
