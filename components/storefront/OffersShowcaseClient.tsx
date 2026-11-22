'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Check, Layers, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { isProductEligibleForOffer, OFFER_TYPE_LABELS } from '@/lib/offers/engine';
import { formatPrice } from '@/lib/utils/format';
import { Category, MembershipConfig, Offer, Product, StoreSettings } from '@/types/store';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

function describeOfferMechanics(offer: Offer, currencySymbol: string, products: Product[]): string {
  const freeTarget = offer.free_product_id
    ? products.find((p) => p.id === offer.free_product_id)?.name
    : null;

  switch (offer.offer_type) {
    case 'bogo_free':
      return freeTarget
        ? `Purchase 1 eligible piece and receive 1× ${freeTarget} complimentary.`
        : 'Purchase 1 eligible piece and receive a matching or lower-priced piece complimentary.';
    case 'buy_2_get_1':
      return freeTarget
        ? `Purchase 2 eligible pieces and receive 1× ${freeTarget} complimentary.`
        : 'Purchase 2 eligible pieces and receive a 3rd eligible piece complimentary.';
    case 'buy_x_get_y':
      return freeTarget
        ? `Purchase ${offer.min_quantity} eligible pieces and receive ${offer.get_free_quantity}× ${freeTarget} complimentary.`
        : `Purchase ${offer.min_quantity} eligible pieces and receive ${offer.get_free_quantity} complimentary piece(s).`;
    case 'buy_2_special_price':
      return `Any 2 eligible pieces bundled at ${formatPrice(
        offer.special_bundle_price || 0,
        currencySymbol
      )}.`;
    case 'buy_3_special_price':
      return `Any 3 eligible pieces bundled at ${formatPrice(
        offer.special_bundle_price || 0,
        currencySymbol
      )}.`;
    case 'bundle_combo':
      return `Combo of ${offer.min_quantity} eligible pieces at ${formatPrice(
        offer.special_bundle_price || 0,
        currencySymbol
      )}.`;
    case 'percentage_discount':
      return `${offer.discount_percentage || 0}% automatic savings on orders of ${offer.min_quantity}+ eligible piece(s).`;
    case 'fixed_discount':
      return `${formatPrice(
        offer.discount_amount || 0,
        currencySymbol
      )} off when ordering ${offer.min_quantity}+ eligible piece(s).`;
    case 'custom_promo':
    default:
      if (offer.special_bundle_price && offer.min_quantity > 1) {
        return `${offer.min_quantity} eligible pieces for ${formatPrice(
          offer.special_bundle_price,
          currencySymbol
        )}.`;
      }
      if (offer.discount_percentage) {
        return `${offer.discount_percentage}% promotional savings on ${offer.min_quantity}+ eligible piece(s).`;
      }
      if (offer.discount_amount) {
        return `${formatPrice(
          offer.discount_amount,
          currencySymbol
        )} savings on ${offer.min_quantity}+ eligible piece(s).`;
      }
      return offer.description || 'Automatically calculated inside your shopping bag.';
  }
}

export function OffersShowcaseClient({
  offers,
  products,
  categories,
  membership,
  settings,
}: {
  offers: Offer[];
  products: Product[];
  categories: Category[];
  membership: MembershipConfig;
  settings: StoreSettings;
}) {
  const { addItem } = useCart();
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

  // Interactive Outfit Combo (Shirt + Pant pairing)
  const outfitComboOffer = useMemo(
    () =>
      offers.find(
        (o) =>
          o.offer_type === 'bundle_combo' ||
          o.id === 'offer-shirt-trouser-combo' ||
          o.name.toLowerCase().includes('combo')
      ) || null,
    [offers]
  );

  const comboProducts = useMemo(() => {
    if (!outfitComboOffer) return [];
    return products.filter((p) => isProductEligibleForOffer(p, outfitComboOffer));
  }, [outfitComboOffer, products]);

  const topOptions = useMemo(() => {
    const tops = comboProducts.filter((p) => p.category_id !== 'cat-trousers');
    return tops.length > 0 ? tops : products.filter((p) => p.category_id === 'cat-shirts');
  }, [comboProducts, products]);

  const bottomOptions = useMemo(() => {
    const bottoms = comboProducts.filter((p) => p.category_id === 'cat-trousers');
    return bottoms.length > 0 ? bottoms : products.filter((p) => p.category_id === 'cat-trousers');
  }, [comboProducts, products]);

  const [selectedTopId, setSelectedTopId] = useState<string>(topOptions[0]?.id || '');
  const [selectedBottomId, setSelectedBottomId] = useState<string>(bottomOptions[0]?.id || '');

  const activeTop = useMemo(
    () => topOptions.find((p) => p.id === selectedTopId) || topOptions[0] || null,
    [topOptions, selectedTopId]
  );
  const activeBottom = useMemo(
    () => bottomOptions.find((p) => p.id === selectedBottomId) || bottomOptions[0] || null,
    [bottomOptions, selectedBottomId]
  );

  const [topVariantId, setTopVariantId] = useState<string>(
    activeTop?.variants.find((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0)?.id ||
      activeTop?.variants[0]?.id ||
      ''
  );
  const [bottomVariantId, setBottomVariantId] = useState<string>(
    activeBottom?.variants.find((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0)
      ?.id ||
      activeBottom?.variants[0]?.id ||
      ''
  );
  const [comboAdded, setComboAdded] = useState(false);

  const resolvedTopVariant = useMemo(
    () =>
      activeTop?.variants.find((v) => v.id === topVariantId) ||
      activeTop?.variants.find((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0) ||
      activeTop?.variants[0] ||
      null,
    [activeTop, topVariantId]
  );

  const resolvedBottomVariant = useMemo(
    () =>
      activeBottom?.variants.find((v) => v.id === bottomVariantId) ||
      activeBottom?.variants.find(
        (v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0
      ) ||
      activeBottom?.variants[0] ||
      null,
    [activeBottom, bottomVariantId]
  );

  const regularComboTotal = (activeTop?.price || 0) + (activeBottom?.price || 0);
  const bundlePrice = outfitComboOffer?.special_bundle_price || regularComboTotal;
  const comboSavings = Math.max(0, regularComboTotal - bundlePrice);

  const handleAddOutfitCombo = () => {
    if (!activeTop || !resolvedTopVariant || !activeBottom || !resolvedBottomVariant) return;
    addItem(activeTop, resolvedTopVariant, 1);
    addItem(activeBottom, resolvedBottomVariant, 1);
    setComboAdded(true);
    setTimeout(() => setComboAdded(false), 1800);
  };

  return (
    <div className="bg-[#FAF9F6]">
      {/* Header */}
      <section className="bg-[#F5F0E7] border-b border-[#E4DDD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-2">
                {settings.brand_name} Atelier Privileges
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#242424] text-balance">
                Active Offers &amp; Curated Combos
              </h1>
              <p className="mt-4 text-sm sm:text-base text-[#5A5853] leading-relaxed">
                Every bundle price, buy-and-get privilege, and seasonal reduction is validated
                automatically in your shopping bag and confirmed via WhatsApp checkout.
              </p>
            </div>

            {membership.is_active && (
              <Link
                href="/membership"
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#102B23] transition-colors shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B99A61]" />
                <span>
                  {membership.name} · {membership.discount_percentage}% Off
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Outfit Combo (Shirt + Pant) Builder */}
      {outfitComboOffer && activeTop && activeBottom && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="bg-white border border-[#173D32] p-6 sm:p-9 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E4DDD0] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B99A61] flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>GIRIDHAR OUTFIT COMBO BUILDER</span>
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">
                  {outfitComboOffer.name}
                </h2>
                <p className="text-xs sm:text-sm text-[#5A5853] mt-1">
                  {outfitComboOffer.description}
                </p>
              </div>
              <div className="text-left md:text-right shrink-0 tabular-nums">
                <p className="text-xs text-[#7A756D] line-through">
                  Regular {formatPrice(regularComboTotal, settings.currency_symbol)}
                </p>
                <p className="font-serif text-3xl font-semibold text-[#173D32]">
                  {formatPrice(bundlePrice, settings.currency_symbol)}
                </p>
                {comboSavings > 0 && (
                  <p className="text-xs font-semibold text-[#B99A61]">
                    Save {formatPrice(comboSavings, settings.currency_symbol)} Automatically
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shirt Selector */}
              <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#173D32]">
                  1. Select Tailored Shirt
                </p>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-[#F5F0E7] border border-[#E4DDD0] shrink-0 overflow-hidden">
                    <SafeImage
                      src={activeTop.images[0]?.url || ''}
                      alt={activeTop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <select
                      value={activeTop.id}
                      onChange={(e) => {
                        const next = topOptions.find((p) => p.id === e.target.value);
                        setSelectedTopId(e.target.value);
                        setTopVariantId(next?.variants[0]?.id || '');
                      }}
                      className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-xs font-semibold text-[#242424]"
                    >
                      {topOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatPrice(p.price, settings.currency_symbol)})
                        </option>
                      ))}
                    </select>
                    <select
                      value={resolvedTopVariant?.id || ''}
                      onChange={(e) => setTopVariantId(e.target.value)}
                      className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-xs text-[#242424]"
                    >
                      {activeTop.variants
                        .filter((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.colour} · Size {v.size}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Trouser Selector */}
              <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#173D32]">
                  2. Select Tailored Trouser
                </p>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-[#F5F0E7] border border-[#E4DDD0] shrink-0 overflow-hidden">
                    <SafeImage
                      src={activeBottom.images[0]?.url || ''}
                      alt={activeBottom.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <select
                      value={activeBottom.id}
                      onChange={(e) => {
                        const next = bottomOptions.find((p) => p.id === e.target.value);
                        setSelectedBottomId(e.target.value);
                        setBottomVariantId(next?.variants[0]?.id || '');
                      }}
                      className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-xs font-semibold text-[#242424]"
                    >
                      {bottomOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatPrice(p.price, settings.currency_symbol)})
                        </option>
                      ))}
                    </select>
                    <select
                      value={resolvedBottomVariant?.id || ''}
                      onChange={(e) => setBottomVariantId(e.target.value)}
                      className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-xs text-[#242424]"
                    >
                      {activeBottom.variants
                        .filter((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.colour} · Waist {v.size}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E4DDD0]">
              <p className="text-xs text-[#5A5853]">
                Both selected pieces are added to your bag and evaluated automatically at the{' '}
                <strong className="text-[#173D32] tabular-nums">
                  {formatPrice(bundlePrice, settings.currency_symbol)}
                </strong>{' '}
                combo rate.
              </p>
              <button
                type="button"
                onClick={handleAddOutfitCombo}
                disabled={!resolvedTopVariant || !resolvedBottomVariant}
                className="px-7 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"
              >
                {comboAdded ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                <span>
                  {comboAdded ? 'Outfit Combo Added to Bag' : 'Add Outfit Combo to Bag'}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Active Offers List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        {offers.length === 0 ? (
          <div className="bg-white border border-[#E4DDD0] p-12 text-center">
            <p className="font-serif text-2xl text-[#242424]">
              No Seasonal Combos Active Right Now
            </p>
            <p className="mt-2 text-sm text-[#5A5853]">
              Browse our full collection or explore annual membership benefits for year-round
              savings.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Link
                href="/shop"
                className="px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.15em]"
              >
                Explore Shop
              </Link>
              <Link
                href="/membership"
                className="px-6 py-3 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase tracking-[0.15em]"
              >
                View Membership
              </Link>
            </div>
          </div>
        ) : (
          offers.map((offer) => {
            const eligibleProducts = products.filter((p) => isProductEligibleForOffer(p, offer));
            const eligibleCatNames = offer.eligible_category_ids
              .map((cid) => categoryNameMap.get(cid))
              .filter(Boolean);

            return (
              <div key={offer.id} className="space-y-8 pb-12 border-b border-[#E4DDD0] last:border-b-0">
                <div className="bg-white border border-[#E4DDD0] grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5853]">
                        <span className="font-semibold uppercase tracking-[0.16em] text-[#173D32]">
                          {OFFER_TYPE_LABELS[offer.offer_type]}
                        </span>
                        {offer.badge_text && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#B99A61] font-medium">{offer.badge_text}</span>
                          </>
                        )}
                      </div>

                      <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424] text-balance">
                        {offer.name}
                      </h2>

                      <p className="text-sm text-[#5A5853] leading-relaxed">{offer.description}</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-[#E4DDD0]">
                      <div className="flex items-start gap-2.5 text-sm text-[#173D32] font-medium">
                        <Tag className="w-4 h-4 shrink-0 mt-0.5 text-[#B99A61]" />
                        <span>{describeOfferMechanics(offer, settings.currency_symbol, products)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A5853] tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#7A756D]" />
                          Valid {offer.start_date} to {offer.end_date}
                        </span>
                        {eligibleCatNames.length > 0 && (
                          <span>
                            · Categories: {eligibleCatNames.join(', ')}
                          </span>
                        )}
                        {offer.eligible_product_ids.length === 0 &&
                          offer.eligible_category_ids.length === 0 && (
                            <span>· Applies storewide</span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 relative min-h-[220px] bg-[#EFE9DD] border-t lg:border-t-0 lg:border-l border-[#E4DDD0] overflow-hidden">
                    <SafeImage
                      src={offer.banner_image_url || '/images/banners/promo-tailoring.svg'}
                      alt={offer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {eligibleProducts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5A5853]">
                        Eligible Pieces ({eligibleProducts.length})
                      </p>
                      <Link
                        href="/shop"
                        className="text-xs font-semibold text-[#173D32] hover:text-[#B99A61] inline-flex items-center gap-1"
                      >
                        <span>Shop All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {eligibleProducts.slice(0, 8).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          currencySymbol={settings.currency_symbol}
                          offers={offers}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
