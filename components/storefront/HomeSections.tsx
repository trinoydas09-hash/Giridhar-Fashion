'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import {
  BrandExperienceFeature,
  Category,
  HomepageBanner,
  HomepageSectionConfig,
  MembershipConfig,
  Offer,
  Product,
  Promotion,
  StoreSettings,
} from '@/types/store';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

interface HomeSectionsProps {
  categories: Category[];
  products: Product[];
  banners: HomepageBanner[];
  sections: HomepageSectionConfig[];
  promotions: Promotion[];
  offers?: Offer[];
  membership?: MembershipConfig;
  brandExperienceFeatures?: BrandExperienceFeature[];
  settings: StoreSettings;
}

export function HomeSections({
  categories,
  products,
  banners,
  sections,
  promotions,
  offers = [],
  membership,
  brandExperienceFeatures = [],
  settings,
}: HomeSectionsProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<{
    status: 'idle' | 'submitting' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const heroBanner = banners.find((b) => b.placement === 'hero') || banners[0];
  const promoBanner = banners.find((b) => b.placement === 'promotional');

  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 4);
  const bestSellers = products.filter((p) => p.is_best_seller).slice(0, 4);
  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 4);
  const activePromotion = promotions[0];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterState({ status: 'submitting', message: '' });
    try {
      const res = await fetch('/api/store/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsletterState({ status: 'error', message: data.error || 'Subscription failed.' });
        return;
      }
      setNewsletterEmail('');
      setNewsletterState({ status: 'success', message: data.message });
    } catch {
      setNewsletterState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  const renderSection = (sec: HomepageSectionConfig) => {
    switch (sec.section_key) {
      case 'hero': {
        if (!heroBanner) return null;
        return (
          <section key={sec.id} className="relative bg-[#173D32] text-[#F5F0E7] overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[520px] lg:min-h-[600px]">
                <motion.div
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-6 py-14 lg:py-20 pr-0 lg:pr-12 flex flex-col justify-center"
                >
                  <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-4">
                    {heroBanner.subtitle || settings.tagline}
                  </p>
                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-[1.08] tracking-tight text-[#FAF9F6] [text-wrap:balance] mb-5">
                    {heroBanner.title}
                  </h1>
                  <p className="text-base text-[#F5F0E7]/85 max-w-lg leading-relaxed mb-8">
                    {heroBanner.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={heroBanner.cta_href || '/shop'}
                      className="inline-flex items-center gap-3 bg-[#B99A61] text-[#173D32] px-7 py-3.5 text-xs font-bold tracking-[0.16em] uppercase hover:bg-[#C9AC75] transition-colors"
                    >
                      <span>{heroBanner.cta_label || 'Explore Collection'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/shop?tag=new"
                      className="inline-flex items-center px-6 py-3.5 border border-[#F5F0E7]/35 text-[#F5F0E7] text-xs font-semibold tracking-[0.14em] uppercase hover:border-[#F5F0E7] transition-colors"
                    >
                      New Arrivals
                    </Link>
                  </div>
                </motion.div>

                <div className="lg:col-span-6 relative min-h-[320px] lg:min-h-full">
                  <SafeImage
                    src={heroBanner.image_url}
                    alt={heroBanner.title}
                    className="w-full h-full object-cover object-[78%_center] lg:absolute lg:inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#173D32]/65 via-transparent to-transparent lg:block hidden" />
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'categories': {
        if (categories.length === 0) return null;
        return (
          <section key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E4DDD0]">
              <div>
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                  {sec.subtitle || 'Curated Wardrobe Pillars'}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
                  {sec.title || 'Shop by Category'}
                </h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61] transition-colors"
              >
                <span>View Full Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.slug === 'new-arrivals' ? '/shop?tag=new' : `/shop?category=${cat.slug}`}
                  className="group block border border-[#E6DFD3] bg-[#F5F0E7]/45 hover:border-[#173D32]/40 transition-colors"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#F5F0E7]">
                    <SafeImage
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <span className="font-serif text-lg font-semibold text-[#242424] group-hover:text-[#173D32]">
                      {cat.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#7A756D] group-hover:text-[#173D32] transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      }

      case 'new_arrivals': {
        const list = newArrivals.length > 0 ? newArrivals : products.slice(0, 4);
        if (list.length === 0) return null;
        return (
          <section key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-18 border-t border-[#E4DDD0]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                  {sec.subtitle || 'Fresh From Our Dhaka Atelier'}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
                  {sec.title || 'New Arrivals'}
                </h2>
              </div>
              <Link
                href="/shop?tag=new"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
              >
                <span>Shop New Arrivals</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
              {list.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  offers={offers}
                  currencySymbol={settings.currency_symbol}
                />
              ))}
            </div>
          </section>
        );
      }

      case 'promotional_banner': {
        if (!promoBanner && !activePromotion) return null;
        const title = activePromotion?.title || promoBanner?.title || '';
        const description = activePromotion?.description || promoBanner?.description || '';
        const subtitle = activePromotion?.discount_text || promoBanner?.subtitle || 'Curated Capsule';
        const image = activePromotion?.banner_image_url || promoBanner?.image_url || '/images/banners/promo-tailoring.svg';
        const ctaHref = activePromotion?.cta_href || promoBanner?.cta_href || '/shop';
        const ctaLabel = promoBanner?.cta_label || 'Explore Capsule';

        return (
          <section key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#242424] text-[#FAF9F6] border border-[#242424] overflow-hidden">
              <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-3">
                  {subtitle}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight [text-wrap:balance] mb-4">
                  {title}
                </h2>
                <p className="text-sm sm:text-base text-[#F5F0E7]/80 leading-relaxed mb-7 max-w-lg">
                  {description}
                </p>
                {activePromotion?.promo_code && (
                  <p className="text-xs tracking-[0.16em] uppercase text-[#B99A61] mb-5">
                    Reference Code: <span className="font-semibold text-white">{activePromotion.promo_code}</span>
                  </p>
                )}
                <div>
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2.5 bg-[#FAF9F6] text-[#242424] px-6 py-3 text-xs font-bold tracking-[0.14em] uppercase hover:bg-[#F5F0E7] transition-colors"
                  >
                    <span>{ctaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-6 min-h-[260px] relative">
                <SafeImage src={image} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        );
      }

      case 'best_sellers': {
        const list = bestSellers.length > 0 ? bestSellers : products.slice(0, 4);
        if (list.length === 0) return null;
        return (
          <section key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                  {sec.subtitle || 'Signature Client Favourites'}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
                  {sec.title || 'Best Sellers'}
                </h2>
              </div>
              <Link
                href="/shop?tag=bestseller"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
              >
                <span>View Best Sellers</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
              {list.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  offers={offers}
                  currencySymbol={settings.currency_symbol}
                />
              ))}
            </div>
          </section>
        );
      }

      case 'featured_collections': {
        const list = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4);
        if (list.length === 0) return null;
        return (
          <section key={sec.id} className="bg-[#F5F0E7]/70 border-y border-[#E4DDD0] py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#173D32] mb-1.5">
                    {sec.subtitle || 'Refined Everyday Tailoring'}
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
                    {sec.title || 'Featured Collections'}
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
                >
                  <span>Browse All</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
                {list.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    offers={offers}
                    currencySymbol={settings.currency_symbol}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'brand_story': {
        return (
          <section id="story" key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-22">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-5 bg-[#F5F0E7] border border-[#E4DDD0] p-8 sm:p-10 flex items-center justify-center">
                <img
                  src={settings.logo_url || '/assets/aistudio/image_32af7105.png'}
                  alt={settings.brand_name}
                  className="w-full max-w-[300px] h-auto object-contain mix-blend-multiply"
                />
              </div>
              <div className="lg:col-span-7 space-y-5">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61]">
                  {sec.subtitle || 'Craftsmanship & Philosophy'}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] [text-wrap:balance]">
                  {settings.story_title}
                </h2>
                <p className="text-base text-[#5A5853] leading-relaxed">
                  {settings.story_body}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[#E4DDD0]">
                  <div>
                    <p className="font-serif text-lg font-semibold text-[#173D32]">Natural Fibres</p>
                    <p className="text-xs text-[#5A5853] mt-1">Combed Supima cotton, washed flax linen, and breathable French terry.</p>
                  </div>
                  <div>
                    <p className="font-serif text-lg font-semibold text-[#173D32]">Dhaka Tailored</p>
                    <p className="text-xs text-[#5A5853] mt-1">Proportioned for tropical warmth and refined seasonal layering.</p>
                  </div>
                  <div>
                    <p className="font-serif text-lg font-semibold text-[#173D32]">Direct Concierge</p>
                    <p className="text-xs text-[#5A5853] mt-1">Personal sizing guidance and cash-on-delivery across Bangladesh.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'social_gallery': {
        const galleryItems = products.slice(0, 4);
        if (galleryItems.length === 0) return null;
        return (
          <section key={sec.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 border-t border-[#E4DDD0]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                  {sec.subtitle || '@giridharfashion'}
                </p>
                <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                  {sec.title || 'Journal & Lookbook'}
                </h2>
              </div>
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
              >
                <span>Follow on Instagram</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {galleryItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug}`}
                  className="group relative aspect-square overflow-hidden bg-[#F5F0E7] border border-[#E6DFD3]"
                >
                  <SafeImage
                    src={item.images[0]?.url || ''}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#173D32]/80 to-transparent text-[#FAF9F6] opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      }

      case 'newsletter': {
        return (
          <section key={sec.id} className="bg-[#F5F0E7] border-t border-[#E4DDD0] py-16">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-2">
                {sec.subtitle || 'Early access to seasonal drops'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] mb-3">
                {sec.title || 'Private Dispatch'}
              </h2>
              <p className="text-sm text-[#5A5853] mb-7">
                Receive quiet dispatches when limited-run fabrics, vintage capsules, and seasonal edits arrive at our Banani studio.
              </p>

              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-white border border-[#D8CFC0] px-4 py-3 text-sm text-[#242424] placeholder:text-[#7A756D] focus:outline-none focus:border-[#173D32]"
                />
                <button
                  type="submit"
                  disabled={newsletterState.status === 'submitting'}
                  className="px-7 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#102B23] transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {newsletterState.status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>

              {newsletterState.status === 'success' && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#173D32]">
                  <Check className="w-4 h-4" />
                  <span>{newsletterState.message}</span>
                </p>
              )}
              {newsletterState.status === 'error' && (
                <p className="mt-4 text-xs font-medium text-[#991B1B]">{newsletterState.message}</p>
              )}
            </div>
          </section>
        );
      }

      case 'brand_experience': {
        const visibleFeatures = brandExperienceFeatures
          .filter((f) => f.status !== 'disabled')
          .sort((a, b) => a.display_order - b.display_order);
        if (visibleFeatures.length === 0) return null;

        return (
          <section key={sec.id} className="bg-[#FAF9F6] border-t border-[#E4DDD0] py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E4DDD0]">
                <div>
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                    {sec.subtitle || 'Curated Services, Memberships & Seasonal Drops'}
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
                    {sec.title || 'The GIRIDHAR Experience'}
                  </h2>
                </div>
                <Link
                  href="/style-guide"
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
                >
                  <span>Explore Experiences</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {visibleFeatures.map((feat) => {
                  const isComingSoon = feat.status === 'coming_soon';
                  return (
                    <Link
                      key={feat.id}
                      href={feat.route_path}
                      className={`group border p-6 flex flex-col justify-between gap-5 transition-colors ${
                        isComingSoon
                          ? 'bg-[#F5F0E7]/50 border-[#E4DDD0] hover:border-[#B99A61]'
                          : 'bg-white border-[#E4DDD0] hover:border-[#173D32]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em]">
                          {isComingSoon ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#5A5853]">
                              <Clock className="w-3 h-3 text-[#B99A61]" />
                              <span>Coming Soon</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-[#173D32]">Atelier Experience</span>
                          )}
                        </div>
                        <h3 className="font-serif text-xl font-semibold text-[#242424] group-hover:text-[#173D32]">
                          {feat.feature_name}
                        </h3>
                        <p className="text-xs text-[#5A5853] leading-relaxed line-clamp-3">
                          {feat.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#E4DDD0] flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#173D32]">
                        <span>{isComingSoon ? 'Preview Release' : 'Open Experience'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      {sections.map((sec) => renderSection(sec))}
      {(offers.length > 0 || membership?.is_active) && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 border-t border-[#E4DDD0]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {offers.length > 0 && (
              <div className="lg:col-span-7 bg-white border border-[#E4DDD0] p-7 sm:p-9 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61]">
                    Active Atelier Offers
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                    Curated Bundles & Seasonal Privileges
                  </h2>
                  <div className="divide-y divide-[#E4DDD0] border-t border-[#E4DDD0] pt-1">
                    {offers.slice(0, 3).map((offer) => (
                      <div key={offer.id} className="py-3 flex items-baseline justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#242424]">{offer.name}</p>
                          <p className="text-xs text-[#5A5853] mt-0.5 line-clamp-1">{offer.description}</p>
                        </div>
                        {offer.badge_text && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#173D32] shrink-0">
                            {offer.badge_text}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Link
                    href="/offers"
                    className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
                  >
                    <span>Explore All Offers</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {membership?.is_active && (
              <div className="lg:col-span-5 bg-[#173D32] text-[#F5F0E7] border border-[#173D32] p-7 sm:p-9 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61]">
                    {membership.tagline}
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[#FAF9F6]">
                    {membership.name}
                  </h2>
                  <p className="text-sm text-[#F5F0E7]/85 leading-relaxed">
                    {membership.promo_banner_text}
                  </p>
                  <p className="font-serif text-2xl font-semibold text-[#B99A61] tabular-nums pt-1">
                    {settings.currency_symbol}{membership.price_bdt}/{membership.billing_period_label}
                  </p>
                </div>
                <div>
                  <Link
                    href="/membership"
                    className="inline-flex items-center gap-2.5 bg-[#B99A61] text-[#173D32] px-6 py-3 text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#C9AC75] transition-colors"
                  >
                    <span>{membership.cta_button_label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
