import type { Metadata } from 'next';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { Navbar } from '@/components/storefront/Navbar';
import { ShopCatalog } from '@/components/storefront/ShopCatalog';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop Menswear Collection',
  description:
    'Browse tailored shirts, heavyweight hoodies, cable knit sweaters, pleated trousers, and vintage capsules from GIRIDHAR FASHION.',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const data = await getPublicStoreData();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        <ShopCatalog
          products={data.products}
          categories={data.categories}
          offers={data.offers}
          settings={data.settings}
          initialCategory={sp.category || ''}
          initialSearch={sp.search || ''}
          initialTag={sp.tag || ''}
        />
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
