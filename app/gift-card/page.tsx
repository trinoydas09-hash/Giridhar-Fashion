import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { FeatureComingSoonView } from '@/components/storefront/FeatureComingSoonView';
import { Footer } from '@/components/storefront/Footer';
import { Navbar } from '@/components/storefront/Navbar';
import { PhaseExperienceClient } from '@/components/storefront/PhaseExperienceClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GIRIDHAR Gift Card',
  description: 'Digital menswear gift vouchers from GIRIDHAR FASHION.',
};

export default async function GiftCardPage() {
  const data = await getPublicStoreData();
  const feature = data.brand_experience_features.find((f) => f.feature_key === 'gift_card');

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
          <PhaseExperienceClient
            feature={feature}
            products={data.products}
            surpriseBoxes={data.surprise_boxes}
            settings={data.settings}
          />
        )}
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
