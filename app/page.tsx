import { getPublicStoreData } from '@/lib/services/store-repository';
import { Navbar } from '@/components/storefront/Navbar';
import { HomeSections } from '@/components/storefront/HomeSections';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getPublicStoreData();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        <HomeSections
          categories={data.categories}
          products={data.products}
          banners={data.banners}
          sections={data.sections}
          promotions={data.promotions}
          offers={data.offers}
          membership={data.membership}
          brandExperienceFeatures={data.brand_experience_features}
          settings={data.settings}
        />
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
