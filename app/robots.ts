import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://giridharfashion.store';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/products/'],
        disallow: ['/admin', '/api/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
