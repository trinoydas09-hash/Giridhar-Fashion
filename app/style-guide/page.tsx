import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { FeatureComingSoonView } from '@/components/storefront/FeatureComingSoonView';
import { Footer } from '@/components/storefront/Footer';
import { Navbar } from '@/components/storefront/Navbar';
import { StyleGuideClient } from '@/components/storefront/StyleGuideClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GIRIDHAR Style Guide',
  description:
    'Editorial menswear styling guide, outfit combinations, colour coordination notes, and occasion styling at GIRIDHAR FASHION.',
};

export default async function StyleGuidePage() {
  const data = await getPublicStoreData();
  const feature = data.brand_experience_features.find((f) => f.feature_key === 'style_guide');

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
          <StyleGuideClient
            styleGuides={data.style_guides}
            products={data.products}
            offers={data.offers}
            settings={data.settings}
          />
        )}
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
