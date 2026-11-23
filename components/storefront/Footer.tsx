'use client';

import Link from 'next/link';
import { useCart } from '@/components/providers/CartProvider';
import { StoreSettings } from '@/types/store';

export function Footer({ settings }: { settings: StoreSettings }) {
  const { brandExperienceFeatures, featuresLoaded } = useCart();

  const isVisible = (key: string) => {
    if (!featuresLoaded) return true;
    return brandExperienceFeatures.some((f) => f.feature_key === key && f.status !== 'disabled');
  };

  return (
    <footer className="bg-[#173D32] text-[#F5F0E7] border-t border-[#102B23]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#F5F0E7]/15">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#FAF9F6] px-2.5 py-1.5 inline-flex items-center">
                <img
                  src={settings.logo_url || '/assets/aistudio/image_32af7105.png'}
                  alt={settings.brand_name}
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold tracking-[0.06em] text-[#F5F0E7]">
                  {settings.brand_name}
                </h3>
                <p className="text-xs tracking-[0.14em] uppercase text-[#B99A61]">
                  {settings.tagline}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#F5F0E7]/80 max-w-md leading-relaxed">
              Modern · Minimal · Distinct menswear, designed in Bangladesh.
            </p>
            {settings.address && (
              <p className="text-xs text-[#F5F0E7]/65">{settings.address}</p>
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#B99A61]">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-[#F5F0E7]/85">
              <li><Link href="/shop" className="hover:text-white transition-colors">All Pieces</Link></li>
              {isVisible('outfit_combo') && (
                <li><Link href="/offers" className="hover:text-white transition-colors">Offers & Combos</Link></li>
              )}
              {isVisible('style_guide') && (
                <li><Link href="/style-guide" className="hover:text-white transition-colors">Style Guide</Link></li>
              )}
              {isVisible('surprise_box') && (
                <li><Link href="/surprise-box" className="hover:text-white transition-colors">Surprise Box</Link></li>
              )}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#B99A61]">
              Client Care
            </h4>
            <ul className="space-y-2.5 text-sm text-[#F5F0E7]/85">
              {isVisible('vip_membership') && (
                <li><Link href="/membership" className="hover:text-white transition-colors">VIP Membership</Link></li>
              )}
              <li><Link href="/cart" className="hover:text-white transition-colors">Shopping Bag</Link></li>
              <li><Link href="/checkout" className="hover:text-white transition-colors">WhatsApp Checkout</Link></li>
              <li><Link href="/affiliates" className="hover:text-white transition-colors">Affiliate Programme</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Store Admin</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#B99A61]">
              Bangladesh Concierge
            </h4>
            {settings.delivery_info && (
              <p className="text-sm text-[#F5F0E7]/80 leading-relaxed">{settings.delivery_info}</p>
            )}
            {settings.store_email && (
              <p className="text-sm text-[#F5F0E7]">{settings.store_email}</p>
            )}
            {(settings.instagram_url || settings.facebook_url) && (
              <div className="flex items-center gap-4 pt-2 text-xs tracking-wider uppercase text-[#B99A61]">
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Instagram
                  </a>
                )}
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F5F0E7]/65">
          <p>© {new Date().getFullYear()} {settings.brand_name}. All rights reserved.</p>
          <p>Currency: {settings.currency_code} ({settings.currency_symbol}) · Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
