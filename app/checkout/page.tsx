import type { Metadata } from 'next';
import { getPublicStoreData } from '@/lib/services/store-repository';
import { Navbar } from '@/components/storefront/Navbar';
import { CheckoutClient } from '@/components/storefront/CheckoutClient';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WhatsApp Checkout',
  description: 'Confirm your GIRIDHAR FASHION order directly via WhatsApp concierge.',
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const sp = await searchParams;
  const data = await getPublicStoreData();
  const mode = sp.mode === 'buy-now' ? 'buy-now' : 'cart';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        <CheckoutClient
          settings={data.settings}
          catalog={data.products}
          offers={data.offers}
          mode={mode}
        />
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
