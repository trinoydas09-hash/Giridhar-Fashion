'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { StoreSettings } from '@/types/store';
import { CartDrawer } from './CartDrawer';

interface NavbarProps {
  settings: StoreSettings;
}

export function Navbar({ settings }: NavbarProps) {
  const router = useRouter();
  const { itemCount, setDrawerOpen, hydrated, brandExperienceFeatures, featuresLoaded } = useCart();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isNavVisible = (key: string) => {
    if (!featuresLoaded) return true;
    return brandExperienceFeatures.some((f) => f.feature_key === key && f.status !== 'disabled');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <>
      {settings.announcement_active && settings.announcement_text && !announcementDismissed && (
        <div className="relative bg-[#173D32] text-[#F5F0E7] text-xs py-2 px-10 text-center tracking-wide">
          <p className="truncate">{settings.announcement_text}</p>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#F5F0E7]/80 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E4DDD0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-[72px] items-center justify-between gap-1 sm:gap-4 md:gap-6 min-w-0">
            {/* Zone 1: Brand Identity */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-2 text-[#242424] hover:text-[#173D32] min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                href="/"
                className="flex items-center gap-1 sm:gap-2.5 whitespace-nowrap shrink-0 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]"
              >
                <img
                  src={settings.logo_url || '/assets/aistudio/image_32af7105.png'}
                  alt={settings.brand_name}
                  className="h-8 sm:h-9 md:h-10 w-auto object-contain mix-blend-multiply"
                />
                <span className="font-serif text-[13px] sm:text-lg md:text-xl font-bold tracking-[0.01em] sm:tracking-[0.06em] text-[#173D32] whitespace-nowrap shrink-0">
                  {settings.brand_name}
                </span>
              </Link>
            </div>

            {/* Zone 2: Clean Single-Line Navigation */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-[#242424]" aria-label="Primary">
              <Link
                href="/"
                className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
              >
                Home
              </Link>
              <Link
                href="/shop"
                className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
              >
                Shop
              </Link>
              {isNavVisible('style_guide') && (
                <Link
                  href="/style-guide"
                  className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
                >
                  Style Guide
                </Link>
              )}
              {isNavVisible('surprise_box') && (
                <Link
                  href="/surprise-box"
                  className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
                >
                  Surprise Box
                </Link>
              )}
              {isNavVisible('outfit_combo') && (
                <Link
                  href="/offers"
                  className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
                >
                  Offers
                </Link>
              )}
              {isNavVisible('vip_membership') && (
                <Link
                  href="/membership"
                  className="whitespace-nowrap shrink-0 hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
                >
                  Membership
                </Link>
              )}
              <Link
                href="/affiliates"
                className="whitespace-nowrap shrink-0 text-[#5A5853] hover:text-[#173D32] transition-colors py-1 border-b border-transparent hover:border-[#B99A61]"
              >
                Affiliate Programme
              </Link>
            </nav>

            {/* Zone 3: Search & Shopping Bag Action */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSearchOpen((prev) => !prev)}
                aria-label="Toggle product search"
                className="p-2 text-[#242424] hover:text-[#173D32] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open shopping bag"
                className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.12em] uppercase hover:bg-[#102B23] transition-colors whitespace-nowrap shrink-0 min-h-[40px] min-w-[40px]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="tabular-nums hidden sm:inline">Bag ({hydrated ? itemCount : 0})</span>
              </button>
            </div>
          </div>

          {searchOpen && (
            <form onSubmit={handleSearchSubmit} className="pb-4 pt-1 border-t border-[#E4DDD0]/70 flex gap-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sweaters, linen shirts, hoodies, trousers..."
                autoFocus
                className="flex-1 bg-white border border-[#D8CFC0] px-4 py-2.5 text-sm text-[#242424] placeholder:text-[#7A756D] focus:outline-none focus:border-[#173D32]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.12em] uppercase hover:bg-[#102B23] transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#173D32]/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-80 max-w-[85vw] bg-[#FAF9F6] h-full flex flex-col justify-between p-6 border-r border-[#E4DDD0] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[#E4DDD0]">
                <span className="font-serif text-lg font-bold tracking-[0.06em] text-[#173D32]">
                  {settings.brand_name}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 text-[#242424] min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-5 flex gap-2">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search pieces..."
                  className="flex-1 bg-white border border-[#D8CFC0] px-3 py-2 text-sm focus:outline-none focus:border-[#173D32]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase"
                >
                  Go
                </button>
              </form>

              <nav className="mt-6 flex flex-col divide-y divide-[#E4DDD0]" aria-label="Mobile Navigation">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3.5 text-base font-medium text-[#242424]"
                >
                  Home
                </Link>
                <Link
                  href="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3.5 text-base font-medium text-[#242424]"
                >
                  Shop All Pieces
                </Link>
                {isNavVisible('style_guide') && (
                  <Link
                    href="/style-guide"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3.5 text-base font-medium text-[#173D32]"
                  >
                    GIRIDHAR Style Guide
                  </Link>
                )}
                {isNavVisible('surprise_box') && (
                  <Link
                    href="/surprise-box"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3.5 text-base font-medium text-[#173D32]"
                  >
                    Surprise Box
                  </Link>
                )}
                {isNavVisible('outfit_combo') && (
                  <Link
                    href="/offers"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3.5 text-base font-medium text-[#173D32]"
                  >
                    Offers &amp; Outfit Combos
                  </Link>
                )}
                {isNavVisible('vip_membership') && (
                  <Link
                    href="/membership"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3.5 text-base font-medium text-[#173D32]"
                  >
                    VIP Membership
                  </Link>
                )}
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3.5 text-base font-medium text-[#242424]"
                >
                  Shopping Bag ({hydrated ? itemCount : 0})
                </Link>
                <Link
                  href="/affiliates"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3.5 text-base font-medium text-[#5A5853]"
                >
                  Affiliate Programme
                </Link>
              </nav>
            </div>

            <div className="pt-6 border-t border-[#E4DDD0] text-xs text-[#5A5853] space-y-1">
              <p className="font-semibold text-[#173D32]">{settings.tagline}</p>
              <p>{settings.address}</p>
            </div>
          </div>
        </div>
      )}

      <CartDrawer currencySymbol={settings.currency_symbol} />
    </>
  );
}
