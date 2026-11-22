import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { FeatureComingSoonView } from '@/components/storefront/FeatureComingSoonView';
import { Navbar } from '@/components/storefront/Navbar';
import { MembershipClient } from '@/components/storefront/MembershipClient';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicStoreData();
  return {
    title: data.membership.name,
    description: `${data.membership.name} — ${data.membership.discount_percentage}% discount across all GIRIDHAR FASHION pieces for ${data.settings.currency_symbol}${data.membership.price_bdt}/${data.membership.billing_period_label}.`,
  };
}

export default async function MembershipPage() {
  const data = await getPublicStoreData();
  const feature = data.brand_experience_features.find((f) => f.feature_key === 'vip_membership');

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
          <MembershipClient membership={data.membership} settings={data.settings} />
        )}
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
