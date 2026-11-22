import type { Metadata } from 'next';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { Navbar } from '@/components/storefront/Navbar';
import { CartPageClient } from '@/components/storefront/CartPageClient';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shopping Bag',
  description: 'Review your selected GIRIDHAR FASHION pieces before WhatsApp order confirmation.',
};

export default async function CartPage() {
  const data = await getPublicStoreData();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        <CartPageClient catalog={data.products} offers={data.offers} settings={data.settings} />
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
