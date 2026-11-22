'use client';

import Link from 'next/link';
import { Gift, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { SafeImage } from './SafeImage';

export function CartDrawer({ currencySymbol = '৳' }: { currencySymbol?: string }) {
  const {
    items,
    drawerOpen,
    setDrawerOpen,
    subtotal,
    offerEvaluation,
    itemCount,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!drawerOpen) return null;

  const hasSavings = offerEvaluation.total_discount > 0 || offerEvaluation.free_items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-[#173D32]/35 backdrop-blur-[2px] transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FAF9F6] border-l border-[#E4DDD0] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4DDD0]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#173D32]" />
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              Your Bag <span className="text-base font-sans font-normal text-[#5A5853] tabular-nums">({itemCount})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close shopping bag"
            className="p-2 text-[#5A5853] hover:text-[#173D32] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 flex items-center justify-center bg-[#F5F0E7] border border-[#E4DDD0] mb-4">
                <ShoppingBag className="w-6 h-6 text-[#173D32]" />
              </div>
              <p className="font-serif text-xl text-[#242424] mb-1.5">Your shopping bag is empty</p>
              <p className="text-sm text-[#5A5853] max-w-xs mb-6">
                Explore tailored shirts, heavyweight hoodies, and knitwear crafted in our Dhaka atelier.
              </p>
              <Link
                href="/shop"
                onClick={() => setDrawerOpen(false)}
                className="px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#102B23] transition-colors"
              >
                Explore Collection
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <ul className="divide-y divide-[#E4DDD0]">
                {items.map((item) => {
                  const itemHref =
                    item.item_type === 'surprise_box'
                      ? '/surprise-box'
                      : `/products/${item.product_slug}`;
                  return (
                    <li key={item.id} className="py-5 first:pt-0 flex gap-4">
                      <Link
                        href={itemHref}
                        onClick={() => setDrawerOpen(false)}
                        className="w-20 h-26 shrink-0 bg-[#F5F0E7] border border-[#E4DDD0] overflow-hidden"
                      >
                        <SafeImage
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={itemHref}
                              onClick={() => setDrawerOpen(false)}
                              className="text-sm font-semibold text-[#242424] hover:text-[#173D32] line-clamp-1"
                            >
                              {item.product_name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Remove ${item.product_name}`}
                              className="text-[#7A756D] hover:text-[#991B1B] p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-[#5A5853] mt-1">
                            {item.colour} · Size {item.size}
                          </p>
                        </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center border border-[#D8CFC0] bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="w-8 h-8 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            disabled={item.quantity >= item.max_stock}
                            className="w-8 h-8 flex items-center justify-center text-[#242424] hover:bg-[#F5F0E7] disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-[#173D32] tabular-nums">
                          {formatPrice(item.unit_price * item.quantity, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>

              {offerEvaluation.eligible_hints.length > 0 && (
                <div className="bg-[#F5F0E7] border border-[#B99A61]/45 p-3 space-y-1">
                  {offerEvaluation.eligible_hints.map((hint) => (
                    <p key={hint} className="text-[11px] text-[#173D32] flex items-start gap-1.5 leading-snug">
                      <Tag className="w-3.5 h-3.5 text-[#B99A61] shrink-0 mt-0.5" />
                      <span>{hint}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E4DDD0] bg-[#F5F0E7]/60 px-6 py-5 space-y-3.5">
            {hasSavings && (
              <div className="space-y-1.5 pb-2 border-b border-[#E4DDD0] text-xs">
                <div className="flex justify-between text-[#5A5853] tabular-nums">
                  <span>Items Total</span>
                  <span>{formatPrice(subtotal, currencySymbol)}</span>
                </div>
                {offerEvaluation.applied_offers.map((offer) => (
                  <div key={offer.offer_id} className="flex justify-between text-[#173D32] font-medium tabular-nums">
                    <span className="truncate pr-2">{offer.offer_name}</span>
                    {offer.discount_amount > 0 && (
                      <span className="shrink-0">-{formatPrice(offer.discount_amount, currencySymbol)}</span>
                    )}
                  </div>
                ))}
                {offerEvaluation.free_items.map((freeItem, idx) => (
                  <p key={`${freeItem.product_id}-${idx}`} className="text-[#173D32] font-medium flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-[#B99A61] shrink-0" />
                    <span>
                      Free Bonus: {freeItem.quantity}× {freeItem.product_name}
                    </span>
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5A5853]">Estimated Subtotal</span>
              <span className="text-lg font-semibold text-[#173D32] tabular-nums">
                {formatPrice(
                  hasSavings ? offerEvaluation.final_subtotal : subtotal,
                  currencySymbol
                )}
              </span>
            </div>
            <p className="text-xs text-[#5A5853]">
              Delivery charges & WhatsApp order confirmation completed on checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={() => setDrawerOpen(false)}
                className="py-3 px-4 border border-[#173D32] text-[#173D32] text-center text-xs font-semibold tracking-[0.12em] uppercase hover:bg-[#173D32]/5 transition-colors"
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={() => setDrawerOpen(false)}
                className="py-3 px-4 bg-[#173D32] text-[#FAF9F6] text-center text-xs font-semibold tracking-[0.12em] uppercase hover:bg-[#102B23] transition-colors"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
