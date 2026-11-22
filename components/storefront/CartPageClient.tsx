'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Gift, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { evaluateCartOffers } from '@/lib/offers/engine';
import { formatPrice } from '@/lib/utils/format';
import { Offer, Product, StoreSettings } from '@/types/store';
import { SafeImage } from './SafeImage';

export function CartPageClient({
  catalog,
  offers = [],
  settings,
}: {
  catalog: Product[];
  offers?: Offer[];
  settings: StoreSettings;
}) {
  const { items, hydrated, subtotal, updateQuantity, changeVariant, removeItem } = useCart();

  const productById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const offerEvaluation = useMemo(() => {
    const garmentItems = items.filter((i) => i.item_type !== 'surprise_box');
    const boxSubtotal = items
      .filter((i) => i.item_type === 'surprise_box')
      .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const garmentEval = evaluateCartOffers({
      items: garmentItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      products: catalog,
      offers,
    });
    return {
      ...garmentEval,
      original_subtotal: garmentEval.original_subtotal + boxSubtotal,
      final_subtotal: garmentEval.final_subtotal + boxSubtotal,
    };
  }, [items, catalog, offers]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-64 bg-[#F5F0E7]/60 animate-pulse border border-[#E4DDD0]" />
      </div>
    );
  }

  const finalSubtotal =
    offerEvaluation.total_discount > 0 ? offerEvaluation.final_subtotal : subtotal;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="pb-8 border-b border-[#E4DDD0] flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
            GIRIDHAR FASHION
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#242424]">Shopping Bag</h1>
        </div>
        <Link
          href="/shop"
          className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
        >
          Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 border border-[#E4DDD0] bg-[#F5F0E7]/45 p-12 sm:p-16 text-center">
          <div className="w-16 h-16 mx-auto bg-white border border-[#E4DDD0] flex items-center justify-center mb-5">
            <ShoppingBag className="w-7 h-7 text-[#173D32]" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#242424] mb-2">
            Your shopping bag is currently empty
          </h2>
          <p className="text-sm text-[#5A5853] max-w-md mx-auto mb-8">
            Explore our Dhaka-tailored shirts, heavyweight 420 GSM hoodies, and cable knit sweaters.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors"
          >
            <span>Explore Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Item List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="divide-y divide-[#E4DDD0] border-t border-b border-[#E4DDD0]">
              {items.map((item) => {
                const isBox = item.item_type === 'surprise_box';
                const itemHref = isBox ? '/surprise-box' : `/products/${item.product_slug}`;
                const product = isBox ? undefined : productById.get(item.product_id);
                const availableVariants =
                  product?.variants.filter(
                    (v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0
                  ) || [];

                return (
                  <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-5">
                    <Link
                      href={itemHref}
                      className="w-24 h-32 shrink-0 bg-[#F5F0E7] border border-[#E4DDD0] overflow-hidden"
                    >
                      <SafeImage
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            href={itemHref}
                            className="font-serif text-xl font-semibold text-[#242424] hover:text-[#173D32]"
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-[#5A5853] mt-1 tabular-nums">
                            Unit Price: {formatPrice(item.unit_price, settings.currency_symbol)} · SKU: {item.sku}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.product_name}`}
                          className="p-2 text-[#7A756D] hover:text-[#991B1B] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {availableVariants.length > 1 && product ? (
                            <label className="text-xs text-[#5A5853] flex items-center gap-2">
                              <span>Variant:</span>
                              <select
                                value={item.variant_id}
                                onChange={(e) => {
                                  const next = availableVariants.find((v) => v.id === e.target.value);
                                  if (next) changeVariant(item.id, product, next);
                                }}
                                className="bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs font-medium text-[#242424] focus:outline-none focus:border-[#173D32]"
                              >
                                {availableVariants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.colour} · Size {v.size}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="text-xs text-[#5A5853]">
                              {item.colour} · Size {item.size}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="inline-flex items-center border border-[#D8CFC0] bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-9 h-9 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                              disabled={item.quantity >= item.max_stock}
                              className="w-9 h-9 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7] disabled:opacity-40"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-base font-semibold text-[#173D32] tabular-nums min-w-[80px] text-right">
                            {formatPrice(item.unit_price * item.quantity, settings.currency_symbol)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {offerEvaluation.eligible_hints.length > 0 && (
              <div className="bg-[#F5F0E7] border border-[#B99A61]/50 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#173D32]">
                  Available Offer Upgrades
                </p>
                {offerEvaluation.eligible_hints.map((hint) => (
                  <p key={hint} className="text-xs text-[#242424] flex items-start gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#B99A61] shrink-0 mt-0.5" />
                    <span>{hint}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <aside className="lg:col-span-4 bg-[#F5F0E7] border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">Order Summary</h2>
            <div className="space-y-3 text-sm border-y border-[#E4DDD0] py-4">
              <div className="flex justify-between">
                <span className="text-[#5A5853]">Items Subtotal</span>
                <span className="font-semibold text-[#242424] tabular-nums">
                  {formatPrice(subtotal, settings.currency_symbol)}
                </span>
              </div>

              {offerEvaluation.applied_offers.map((offer) => (
                <div key={offer.offer_id} className="flex justify-between text-xs text-[#173D32] font-medium">
                  <span className="pr-2">{offer.offer_name}</span>
                  {offer.discount_amount > 0 && (
                    <span className="tabular-nums shrink-0">
                      -{formatPrice(offer.discount_amount, settings.currency_symbol)}
                    </span>
                  )}
                </div>
              ))}

              {offerEvaluation.free_items.map((bonus, idx) => (
                <div key={`${bonus.product_id}-${idx}`} className="flex items-start gap-2 text-xs text-[#173D32] font-medium">
                  <Gift className="w-3.5 h-3.5 text-[#B99A61] shrink-0 mt-0.5" />
                  <span>
                    Complimentary: {bonus.quantity}× {bonus.product_name}
                  </span>
                </div>
              ))}

              <div className="flex justify-between text-xs text-[#5A5853] pt-1">
                <span>Delivery</span>
                <span>
                  {finalSubtotal >= settings.free_delivery_threshold
                    ? 'Complimentary in Dhaka'
                    : `${formatPrice(settings.delivery_charge_dhaka, settings.currency_symbol)} Dhaka / ${formatPrice(settings.delivery_charge_outside, settings.currency_symbol)} Nationwide`}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-[#242424]">Estimated Total</span>
              <span className="text-2xl font-semibold text-[#173D32] tabular-nums">
                {formatPrice(finalSubtotal, settings.currency_symbol)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-[#5A5853] leading-relaxed">
              Orders are confirmed directly with our Dhaka concierge team via WhatsApp. Cash on Delivery supported nationwide.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
