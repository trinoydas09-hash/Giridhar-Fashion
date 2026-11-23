'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Palette, Sparkles } from 'lucide-react';
import { Offer, Product, StoreSettings, StyleGuide } from '@/types/store';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

export function StyleGuideClient({
  styleGuides,
  products,
  offers,
  settings,
}: {
  styleGuides: StyleGuide[];
  products: Product[];
  offers: Offer[];
  settings: StoreSettings;
}) {
  const [selectedOccasion, setSelectedOccasion] = useState<string>('ALL');

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const occasions = useMemo(() => {
    const list = new Set<string>();
    for (const g of styleGuides) {
      if (g.occasion?.trim()) list.add(g.occasion.trim());
    }
    return ['ALL', ...Array.from(list)];
  }, [styleGuides]);

  const visibleGuides = useMemo(() => {
    if (selectedOccasion === 'ALL') return styleGuides;
    return styleGuides.filter((g) => g.occasion.trim() === selectedOccasion);
  }, [styleGuides, selectedOccasion]);

  return (
    <div className="bg-[#FAF9F6]">
      {/* Editorial Hero */}
      <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61]">
              {settings.brand_name} Editorial Styling Journal
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6] leading-[1.08] [text-wrap:balance]">
              GIRIDHAR STYLE GUIDE
            </h1>
            <p className="text-base text-[#F5F0E7]/85 leading-relaxed">
              A considered approach to modern menswear—pairing versatile shirts, balanced silhouettes,
              and understated colour harmony for everyday, work, travel, and evening occasions.
            </p>
          </div>

          {occasions.length > 2 && (
            <div className="mt-8 flex flex-wrap gap-2.5">
              {occasions.map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setSelectedOccasion(occ)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] border transition-colors ${
                    selectedOccasion === occ
                      ? 'bg-[#B99A61] text-[#173D32] border-[#B99A61]'
                      : 'border-[#F5F0E7]/30 text-[#F5F0E7] hover:border-[#F5F0E7]'
                  }`}
                >
                  {occ === 'ALL' ? 'All Occasions' : occ}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Guides Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        {visibleGuides.length === 0 ? (
          <div className="bg-white border border-[#E4DDD0] p-12 text-center space-y-4">
            <BookOpen className="w-7 h-7 text-[#173D32] mx-auto" />
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              Style Guides Being Updated
            </h2>
            <p className="text-sm text-[#5A5853] max-w-md mx-auto">
              Our atelier stylists are preparing fresh seasonal lookbooks. Browse our collection in
              the meantime.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em]"
            >
              <span>Shop All Pieces</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          visibleGuides.map((guide, index) => {
            const connected = guide.connected_product_ids
              .map((id) => productById.get(id))
              .filter((p): p is Product => Boolean(p));
            const matching = guide.matching_product_ids
              .map((id) => productById.get(id))
              .filter((p): p is Product => Boolean(p));
            const combinedShowcase = Array.from(
              new Map([...connected, ...matching].map((p) => [p.id, p])).values()
            ).slice(0, 4);

            return (
              <article
                key={guide.id}
                className="space-y-8 pb-14 border-b border-[#E4DDD0] last:border-b-0"
              >
                <div className="bg-white border border-[#E4DDD0] grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-5 bg-[#F5F0E7] border-b lg:border-b-0 lg:border-r border-[#E4DDD0] min-h-[280px] overflow-hidden">
                    <SafeImage
                      src={guide.image_url || '/images/experiences/style-guide.svg'}
                      alt={guide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="lg:col-span-7 p-7 sm:p-10 space-y-6">
                    <div className="space-y-2.5 border-b border-[#E4DDD0] pb-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5853]">
                        <span className="font-mono text-[#B99A61] tabular-nums">
                          0{index + 1}.
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold uppercase tracking-[0.16em] text-[#173D32]">
                          {guide.occasion}
                        </span>
                      </div>
                      <h2 className="font-serif text-3xl font-semibold text-[#242424] [text-wrap:balance]">
                        {guide.title}
                      </h2>
                      <p className="text-sm text-[#5A5853] leading-relaxed">{guide.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                      <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#173D32] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#B99A61]" />
                          <span>Styling Recommendation</span>
                        </p>
                        <p className="text-xs sm:text-sm text-[#242424] leading-relaxed">
                          {guide.styling_recommendations}
                        </p>
                      </div>

                      <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#173D32] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#B99A61]" />
                          <span>Outfit Combination</span>
                        </p>
                        <p className="text-xs sm:text-sm text-[#242424] leading-relaxed">
                          {guide.outfit_combinations}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#F5F0E7]/70 border border-[#E4DDD0] p-4 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#173D32] flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#B99A61]" />
                        <span>Colour Coordination Note</span>
                      </p>
                      <p className="text-xs sm:text-sm text-[#5A5853] leading-relaxed">
                        {guide.colour_coordination_tips}
                      </p>
                    </div>
                  </div>
                </div>

                {combinedShowcase.length > 0 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5A5853]">
                        Featured &amp; Matching Pieces ({combinedShowcase.length})
                      </p>
                      <Link
                        href="/offers"
                        className="text-xs font-semibold text-[#173D32] hover:text-[#B99A61] inline-flex items-center gap-1"
                      >
                        <span>Check Outfit Combos</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
                      {combinedShowcase.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          offers={offers}
                          currencySymbol={settings.currency_symbol}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
