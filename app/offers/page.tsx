import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { FeatureComingSoonView } from '@/components/storefront/FeatureComingSoonView';
import { Navbar } from '@/components/storefront/Navbar';
import { OffersShowcaseClient } from '@/components/storefront/OffersShowcaseClient';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Offers & Curated Combos',
  description:
    'Explore active bundle offers, buy-and-get privileges, and seasonal promotions at GIRIDHAR FASHION.',
};

export default async function OffersPage() {
  const data = await getPublicStoreData();
  const feature = data.brand_experience_features.find((f) => f.feature_key === 'outfit_combo');

  if (!feature || feature.status === 'disabled') {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        {feature.status === 'coming_soon' ? (
          <FeatureComingSoonView feature={feature} settings={data.settings} />
        ) : (
          <OffersShowcaseClient
            offers={data.offers}
            products={data.products}
            categories={data.categories}
            membership={data.membership}
            settings={data.settings}
          />
        )}
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
