'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  Minus,
  Palette,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
} from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { evaluateCartOffers, getActiveOffersForProduct, OFFER_TYPE_LABELS } from '@/lib/offers/engine';
import { calculateDiscountPercent, formatPrice } from '@/lib/utils/format';
import { Offer, Product, StoreSettings, StyleGuide } from '@/types/store';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

interface ProductDetailViewProps {
  product: Product;
  related: Product[];
  offers?: Offer[];
  styleGuides?: StyleGuide[];
  matchingProducts?: Product[];
  styleGuideEnabled?: boolean;
  settings: StoreSettings;
}

export function ProductDetailView({
  product,
  related,
  offers = [],
  styleGuides = [],
  matchingProducts = [],
  styleGuideEnabled = false,
  settings,
}: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem, setDirectBuyNow } = useCart();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColour, setSelectedColour] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const discount = calculateDiscountPercent(product.price, product.compare_at_price);
  const eligibleOffers = useMemo(() => getActiveOffersForProduct(product, offers), [product, offers]);

  const previewOfferEval = useMemo(
    () =>
      evaluateCartOffers({
        items: [{ product_id: product.id, quantity }],
        products: [product],
        offers: eligibleOffers,
      }),
    [product, quantity, eligibleOffers]
  );

  const colours = useMemo(() => {
    const map = new Map<string, { hex: string; hasStock: boolean }>();
    for (const v of product.variants) {
      const inStock = v.stock_status !== 'out_of_stock' && v.stock_quantity > 0;
      const existing = map.get(v.colour);
      map.set(v.colour, {
        hex: v.colour_hex,
        hasStock: Boolean(existing?.hasStock || inStock),
      });
    }
    return Array.from(map.entries()).map(([name, meta]) => ({ name, ...meta }));
  }, [product.variants]);

  const sizes = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of product.variants) {
      if (!seen.has(v.size)) {
        seen.add(v.size);
        list.push(v.size);
      }
    }
    return list;
  }, [product.variants]);

  const activeVariant = useMemo(() => {
    if (!selectedColour || !selectedSize) return null;
    return (
      product.variants.find((v) => v.colour === selectedColour && v.size === selectedSize) || null
    );
  }, [product.variants, selectedColour, selectedSize]);

  const isSizeAvailableForColour = (size: string) => {
    if (!selectedColour) {
      return product.variants.some(
        (v) => v.size === size && v.stock_status !== 'out_of_stock' && v.stock_quantity > 0
      );
    }
    const v = product.variants.find((item) => item.colour === selectedColour && item.size === size);
    return Boolean(v && v.stock_status !== 'out_of_stock' && v.stock_quantity > 0);
  };

  const colourImages = selectedColour
    ? product.images.filter((image) => image.colour?.toLowerCase() === selectedColour.toLowerCase())
    : [];
  const displayedImages = selectedColour && colourImages.length > 0 ? colourImages : product.images;

  const maxStock = activeVariant ? Math.max(0, activeVariant.stock_quantity) : 10;

  const validateSelection = () => {
    if (!selectedColour && !selectedSize) {
      setSelectionError('Please select a colour and size before continuing.');
      return null;
    }
    if (!selectedColour) {
      setSelectionError('Please select your preferred colour.');
      return null;
    }
    if (!selectedSize) {
      setSelectionError('Please select your preferred size.');
      return null;
    }
    if (!activeVariant) {
      setSelectionError('That colour and size combination is unavailable.');
      return null;
    }
    if (activeVariant.stock_status === 'out_of_stock' || activeVariant.stock_quantity <= 0) {
      setSelectionError('Selected variant is currently out of stock.');
      return null;
    }
    setSelectionError(null);
    return activeVariant;
  };

  const handleAddToCart = () => {
    const variant = validateSelection();
    if (!variant) return;
    addItem(product, variant, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const handleBuyNow = () => {
    const variant = validateSelection();
    if (!variant) return;
    setDirectBuyNow(product, variant, quantity);
    router.push('/checkout?mode=buy-now');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-14 pb-28 md:pb-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#5A5853] mb-7" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#173D32]">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-[#173D32]">Shop</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-[#173D32]">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#242424] font-medium truncate">{product.name}</span>
      </nav>

      {/* Main 2-Column Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left: Sticky Multi-Image Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
          <div className="aspect-[3/4] w-full bg-[#F5F0E7] border border-[#E4DDD0] overflow-hidden">
            <SafeImage
              src={displayedImages[activeImageIdx]?.url || displayedImages[0]?.url || ''}
              alt={displayedImages[activeImageIdx]?.alt_text || product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {displayedImages.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {displayedImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[3/4] overflow-hidden border transition-colors bg-[#F5F0E7] ${
                    activeImageIdx === idx
                      ? 'border-[#173D32] ring-1 ring-[#173D32]'
                      : 'border-[#E4DDD0] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img.url}
                    alt={img.alt_text || `${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border-b border-[#E4DDD0] pb-6 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-[#5A5853] uppercase tracking-[0.14em]">
              <span>{product.category?.name || 'Menswear'}</span>
              {product.is_new_arrival && (
                <>
                  <span>·</span>
                  <span className="text-[#173D32] font-semibold">New Arrival</span>
                </>
              )}
              {product.is_best_seller && (
                <>
                  <span>·</span>
                  <span className="text-[#B99A61] font-semibold">Best Seller</span>
                </>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] leading-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-1 tabular-nums">
              <span className="text-2xl font-semibold text-[#173D32]">
                {formatPrice(product.price, settings.currency_symbol)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-base text-[#7A756D] line-through">
                    {formatPrice(product.compare_at_price, settings.currency_symbol)}
                  </span>
                  {discount && (
                    <span className="text-xs font-semibold tracking-wider uppercase text-[#173D32] bg-[#F5F0E7] px-2 py-0.5 border border-[#E4DDD0]">
                      Save {discount}%
                    </span>
                  )}
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm text-[#5A5853] pt-1 leading-relaxed">{product.short_description}</p>
            )}
          </div>

          {/* Active Eligible Offers Privilege Box */}
          {eligibleOffers.length > 0 && (
            <div className="bg-[#F5F0E7] border border-[#B99A61]/50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#173D32] inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#B99A61]" />
                  <span>Active Atelier Offer</span>
                </span>
                <Link href="/offers" className="text-[11px] font-semibold text-[#173D32] underline underline-offset-4">
                  All Offers
                </Link>
              </div>
              {eligibleOffers.map((offer) => (
                <div key={offer.id} className="text-xs text-[#242424] space-y-0.5">
                  <p className="font-semibold">
                    {offer.name}{' '}
                    <span className="text-[11px] font-normal text-[#5A5853]">
                      ({OFFER_TYPE_LABELS[offer.offer_type]})
                    </span>
                  </p>
                  {offer.description && <p className="text-[#5A5853] leading-snug">{offer.description}</p>}
                </div>
              ))}
              {previewOfferEval.total_discount > 0 && (
                <p className="text-xs font-semibold text-[#173D32] pt-1 border-t border-[#E4DDD0] tabular-nums">
                  With Qty {quantity}: Save {formatPrice(previewOfferEval.total_discount, settings.currency_symbol)} →{' '}
                  {formatPrice(previewOfferEval.final_subtotal, settings.currency_symbol)}
                </p>
              )}
            </div>
          )}

          {/* Mandatory Colour Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-[0.12em] uppercase text-[#242424]">
                Colour:{' '}
                <span className="font-normal text-[#5A5853]">
                  {selectedColour || 'Select a colour'}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {colours.map((c) => {
                const isSelected = selectedColour === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedColour(c.name);
                      setActiveImageIdx(0);
                      setSelectionError(null);
                      setQuantity(1);
                    }}
                    disabled={!c.hasStock}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs border transition-colors min-h-[40px] ${
                      isSelected
                        ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6] font-semibold'
                        : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                    } disabled:opacity-40 disabled:line-through`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Size Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-[0.12em] uppercase text-[#242424]">
                Size:{' '}
                <span className="font-normal text-[#5A5853]">
                  {selectedSize || 'Select a size'}
                </span>
              </span>
              {activeVariant && (
                <span className="text-xs text-[#5A5853] tabular-nums">
                  SKU: {activeVariant.sku}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {sizes.map((size) => {
                const available = isSizeAvailableForColour(size);
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size);
                      setSelectionError(null);
                      setQuantity(1);
                    }}
                    disabled={!available}
                    className={`py-2.5 px-3 text-xs font-semibold border transition-colors min-h-[44px] ${
                      isSelected
                        ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6]'
                        : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                    } disabled:opacity-35 disabled:bg-[#F5F0E7] disabled:line-through`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Stock Status */}
          {activeVariant && (
            <div className="text-xs flex items-center gap-2">
              {activeVariant.stock_status === 'in_stock' && (
                <span className="text-[#173D32] font-medium">
                  In Stock · {activeVariant.stock_quantity} available for dispatch
                </span>
              )}
              {activeVariant.stock_status === 'low_stock' && (
                <span className="text-[#9A6B1E] font-medium">
                  Low Stock · Only {activeVariant.stock_quantity} remaining
                </span>
              )}
              {activeVariant.stock_status === 'out_of_stock' && (
                <span className="text-[#991B1B] font-medium">
                  Out of Stock for this variant
                </span>
              )}
            </div>
          )}

          {/* Quantity & Validation */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-[0.12em] uppercase text-[#242424]">
              Quantity
            </span>
            <div className="inline-flex items-center border border-[#D8CFC0] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-10 h-10 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7]"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, maxStock), q + 1))}
                aria-label="Increase quantity"
                className="w-10 h-10 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectionError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{selectionError}</span>
            </div>
          )}

          {/* Primary Purchase Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-3.5 px-6 border border-[#173D32] bg-white text-[#173D32] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#F5F0E7] transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              {addedFeedback ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>{addedFeedback ? 'Added to Bag' : 'Add to Cart'}</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Buy Now</span>
            </button>
          </div>

          {/* Delivery & Authenticity Notes */}
          <div className="border-t border-[#E4DDD0] pt-5 space-y-3 text-xs text-[#5A5853]">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
              <span>{settings.delivery_info}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
              <span>Direct WhatsApp order confirmation with cash-on-delivery across Bangladesh.</span>
            </div>
          </div>

          {/* Editorial Description */}
          <div className="border-t border-[#E4DDD0] pt-6 space-y-3">
            <h2 className="font-serif text-xl font-semibold text-[#242424]">Garment Notes</h2>
            <p className="text-sm text-[#5A5853] leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications */}
          {product.specifications.length > 0 && (
            <div className="border-t border-[#E4DDD0] pt-6">
              <h2 className="font-serif text-xl font-semibold text-[#242424] mb-3">
                Specifications
              </h2>
              <dl className="divide-y divide-[#E4DDD0] border-y border-[#E4DDD0]">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="py-2.5 flex justify-between gap-4 text-xs sm:text-sm">
                    <dt className="text-[#5A5853] font-medium">{spec.label}</dt>
                    <dd className="text-[#242424] text-right">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Optional Product Styling Guide Section */}
      {styleGuideEnabled && styleGuides.length > 0 && (
        <section className="mt-20 pt-14 border-t border-[#E4DDD0] space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1">
                Atelier Styling Notes
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                How to Style This Piece
              </h2>
            </div>
            <Link
              href="/style-guide"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
            >
              <span>Full Style Guide</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-6">
            {styleGuides.map((guide) => (
              <div
                key={guide.id}
                className="bg-white border border-[#E4DDD0] grid grid-cols-1 lg:grid-cols-12 items-stretch"
              >
                <div className="lg:col-span-4 bg-[#F5F0E7] border-b lg:border-b-0 lg:border-r border-[#E4DDD0] min-h-[220px] overflow-hidden">
                  <SafeImage
                    src={guide.image_url || '/images/experiences/style-guide.svg'}
                    alt={guide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="lg:col-span-8 p-6 sm:p-8 space-y-5">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#173D32] inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#B99A61]" />
                      <span>{guide.occasion}</span>
                    </p>
                    <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                      {guide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5A5853] leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-3.5 space-y-1">
                      <p className="font-semibold uppercase tracking-[0.12em] text-[#173D32] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#B99A61]" />
                        <span>Recommendations</span>
                      </p>
                      <p className="text-[#5A5853] leading-relaxed">
                        {guide.styling_recommendations}
                      </p>
                    </div>
                    <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-3.5 space-y-1">
                      <p className="font-semibold uppercase tracking-[0.12em] text-[#173D32] flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[#B99A61]" />
                        <span>Outfit Pairing</span>
                      </p>
                      <p className="text-[#5A5853] leading-relaxed">{guide.outfit_combinations}</p>
                    </div>
                    <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-3.5 space-y-1">
                      <p className="font-semibold uppercase tracking-[0.12em] text-[#173D32] flex items-center gap-1.5">
                        <Palette className="w-3 h-3 text-[#B99A61]" />
                        <span>Colour Coordination</span>
                      </p>
                      <p className="text-[#5A5853] leading-relaxed">
                        {guide.colour_coordination_tips}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {matchingProducts.length > 0 && (
            <div className="space-y-5 pt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5A5853]">
                Suggested Matching Pieces
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
                {matchingProducts.slice(0, 4).map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    offers={offers}
                    currencySymbol={settings.currency_symbol}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 pt-14 border-t border-[#E4DDD0]">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1">
                Complete the Wardrobe
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                You May Also Consider
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                offers={offers}
                currencySymbol={settings.currency_symbol}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Bar (<= 15% viewport height) */}
      <div className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-[#FAF9F6]/95 backdrop-blur border-t border-[#E4DDD0] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 pr-1">
            <p className="text-xs font-semibold text-[#173D32] tabular-nums">
              {formatPrice(product.price, settings.currency_symbol)}
            </p>
            <p className="text-[11px] text-[#5A5853] truncate">
              {selectedColour && selectedSize ? `${selectedColour} · ${selectedSize}` : 'Select variant'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 py-2.5 px-3 border border-[#173D32] bg-white text-[#173D32] text-[11px] font-bold tracking-[0.12em] uppercase whitespace-nowrap min-h-[44px]"
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 py-2.5 px-3 bg-[#173D32] text-[#FAF9F6] text-[11px] font-bold tracking-[0.12em] uppercase whitespace-nowrap min-h-[44px]"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
