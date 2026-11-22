import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { FeatureComingSoonView } from '@/components/storefront/FeatureComingSoonView';
import { Footer } from '@/components/storefront/Footer';
import { Navbar } from '@/components/storefront/Navbar';
import { SurpriseBoxClient } from '@/components/storefront/SurpriseBoxClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GIRIDHAR Surprise Box',
  description:
    'Select a budget-tiered Mystery Fashion Box curated by GIRIDHAR FASHION stylists according to your size and style preferences.',
};

export default async function SurpriseBoxPage() {
  const data = await getPublicStoreData();
  const feature = data.brand_experience_features.find((f) => f.feature_key === 'surprise_box');

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
          <SurpriseBoxClient
            boxes={data.surprise_boxes}
            categories={data.categories}
            settings={data.settings}
          />
        )}
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
