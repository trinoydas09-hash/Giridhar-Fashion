import type { MetadataRoute } from 'next';
import { getPublicStoreData } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use the public custom domain so sitemap URLs never point to a Vercel deployment URL.
  const baseUrl = 'https://giridharfashion.store';

  const store = await getPublicStoreData();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  const productEntries: MetadataRoute.Sitemap = store.products.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
