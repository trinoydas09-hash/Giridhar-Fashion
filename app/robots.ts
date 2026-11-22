import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL?.startsWith('http')
    ? process.env.APP_URL.replace(/\/$/, '')
    : 'https://giridharfashion.com';

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
