'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Award,
  Check,
  Copy,
  ExternalLink,
  Gift,
  MessageCircle,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { evaluateCartOffers } from '@/lib/offers/engine';
import { formatPrice } from '@/lib/utils/format';
import { validateCustomerPhone } from '@/lib/whatsapp/checkout';
import { Offer, Product, StoreSettings } from '@/types/store';
import { SafeImage } from './SafeImage';

interface AppliedVipMembership {
  code: string;
  discountPercentage: number;
  expiresAt: string | null;
}

export function CheckoutClient({
  settings,
  catalog = [],
  offers = [],
  mode,
}: {
  settings: StoreSettings;
  catalog?: Product[];
  offers?: Offer[];
  mode: 'cart' | 'buy-now';
}) {
  const { items, buyNowItem, hydrated, clearCart, clearBuyNow } = useCart();

  const checkoutItems = useMemo(() => {
    if (mode === 'buy-now' && buyNowItem) {
      return [buyNowItem];
    }
    return items;
  }, [mode, buyNowItem, items]);

  const regularSubtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [checkoutItems]
  );

  const offerEvaluation = useMemo(() => {
    const garmentItems = checkoutItems.filter((i) => i.item_type !== 'surprise_box');
    const boxSubtotal = checkoutItems
      .filter((i) => i.item_type === 'surprise_box')
      .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const garmentEval = evaluateCartOffers({
      items: garmentItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      products: catalog,
      offers,
    });
    return {
      ...garmentEval,
      garment_final_subtotal: garmentEval.final_subtotal,
      box_subtotal: boxSubtotal,
      original_subtotal: garmentEval.original_subtotal + boxSubtotal,
      final_subtotal: garmentEval.final_subtotal + boxSubtotal,
    };
  }, [checkoutItems, catalog, offers]);

  // VIP Membership Code state (validated server-side via /api/store/membership/validate)
  const [membershipCodeInput, setMembershipCodeInput] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [appliedVip, setAppliedVip] = useState<AppliedVipMembership | null>(null);

  const vipDiscountAmount = useMemo(() => {
    if (!appliedVip || offerEvaluation.garment_final_subtotal <= 0) return 0;
    return Math.round(
      offerEvaluation.garment_final_subtotal * (appliedVip.discountPercentage / 100)
    );
  }, [appliedVip, offerEvaluation.garment_final_subtotal]);

  const finalProductTotal = Math.max(
    0,
    offerEvaluation.garment_final_subtotal - vipDiscountAmount
  );
  const grandTotal = finalProductTotal + offerEvaluation.box_subtotal;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [preparedOrder, setPreparedOrder] = useState<{
    referenceCode: string;
    whatsappUrl: string;
    message: string;
    totalAmount: number;
    offerDiscount: number;
    membershipDiscount: number;
    membershipCode: string | null;
  } | null>(null);

  const [confirmedSent, setConfirmedSent] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleApplyMembershipCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = membershipCodeInput.trim().toUpperCase();
    if (!cleaned) {
      setMembershipError('Please enter your Membership Code.');
      return;
    }

    setMembershipError(null);
    setValidatingCode(true);
    try {
      const res = await fetch('/api/store/membership/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleaned,
          items: checkoutItems.map((i) => ({
            item_type: i.item_type || 'product',
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedVip(null);
        setMembershipError(data.error || 'This VIP Membership Code could not be applied.');
        return;
      }

      setAppliedVip({
        code: data.code,
        discountPercentage: data.discountPercentage,
        expiresAt: data.expiresAt || null,
      });
      setMembershipCodeInput(data.code);
    } catch {
      setMembershipError('Network error validating membership code. Please try again.');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRemoveMembershipCode = () => {
    setAppliedVip(null);
    setMembershipError(null);
    setMembershipCodeInput('');
  };

  const handlePrepareWhatsAppOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (checkoutItems.length === 0) {
      setFormError('No products selected for checkout.');
      return;
    }
    if (fullName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!validateCustomerPhone(phone)) {
      setFormError('Please enter a valid phone number (e.g. 017XXXXXXXX or +88017XXXXXXXX).');
      return;
    }
    if (address.trim().length < 8) {
      setFormError('Please enter your complete delivery address (house, road, area, city).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: fullName.trim(),
          customer_phone: phone.trim(),
          delivery_address: address.trim(),
          notes: notes.trim() || undefined,
          membership_code: appliedVip?.code || undefined,
          channel: mode === 'buy-now' ? 'whatsapp_buy_now' : 'whatsapp_cart',
          items: checkoutItems.map((i) => ({
            item_type: i.item_type || 'product',
            product_id: i.product_id,
            variant_id: i.variant_id,
            size: i.size,
            style_preference: i.style_preference,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not generate your WhatsApp checkout link.');
        return;
      }

      setPreparedOrder({
        referenceCode: data.referenceCode,
        whatsappUrl: data.whatsappUrl,
        message: data.message,
        totalAmount: data.totalAmount,
        offerDiscount: data.offerDiscount || 0,
        membershipDiscount: data.membershipDiscount || 0,
        membershipCode: data.membershipCode || null,
      });
    } catch {
      setFormError('Network error while preparing WhatsApp order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSentInWhatsApp = () => {
    setConfirmedSent(true);
    if (mode === 'buy-now') {
      clearBuyNow();
    } else {
      clearCart();
    }
  };

  const handleCopyMessage = async () => {
    if (!preparedOrder) return;
    try {
      await navigator.clipboard.writeText(preparedOrder.message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-64 bg-[#F5F0E7]/60 animate-pulse border border-[#E4DDD0]" />
      </div>
    );
  }

  if (confirmedSent && preparedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="border border-[#173D32]/30 bg-[#F5F0E7]/60 p-8 sm:p-12 text-center space-y-5">
          <div className="w-14 h-14 mx-auto bg-[#173D32] text-[#FAF9F6] flex items-center justify-center">
            <Check className="w-7 h-7" />
          </div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B99A61]">
            Reference · {preparedOrder.referenceCode}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424]">
            Thank You — WhatsApp Inquiry Recorded
          </h1>
          <p className="text-sm text-[#5A5853] leading-relaxed">
            Our GIRIDHAR FASHION team will verify stock and confirm delivery timing directly in your WhatsApp thread.
          </p>
          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="px-7 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#102B23]"
            >
              Continue Browsing
            </Link>
            <a
              href={preparedOrder.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[#173D32] text-[#173D32] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-white inline-flex items-center gap-2"
            >
              <span>Reopen WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <div className="border border-[#E4DDD0] bg-[#F5F0E7]/50 p-12 space-y-5">
          <ShoppingBag className="w-8 h-8 text-[#173D32] mx-auto" />
          <h1 className="font-serif text-3xl font-semibold text-[#242424]">
            No items selected for checkout
          </h1>
          <p className="text-sm text-[#5A5853]">
            Select a piece from our collection before proceeding to WhatsApp order confirmation.
          </p>
          <div>
            <Link
              href="/shop"
              className="inline-block px-7 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.14em] uppercase"
            >
              Browse Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="pb-8 border-b border-[#E4DDD0] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
            {mode === 'buy-now' ? 'Direct Express Order' : 'Shopping Bag Checkout'}
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#242424]">
            WhatsApp Order Confirmation
          </h1>
        </div>
        <Link
          href={mode === 'buy-now' ? '/shop' : '/cart'}
          className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
        >
          {mode === 'buy-now' ? 'Back to Shop' : 'Edit Bag'}
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Customer Details & WhatsApp Flow */}
        <div className="lg:col-span-7 space-y-6">
          {!preparedOrder ? (
            <form onSubmit={handlePrepareWhatsAppOrder} className="space-y-5 bg-white border border-[#E4DDD0] p-6 sm:p-8">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#242424]">
                  Delivery Information
                </h2>
                <p className="text-xs text-[#5A5853] mt-1">
                  Enter your delivery details below to prepare your itemized WhatsApp order message. Eligible active offers and VIP privileges are verified automatically.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label htmlFor="full-name" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                  Full Name *
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rafiqul Islam"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-4 py-3 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01711-000000"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-4 py-3 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                  Delivery Address *
                </label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / Flat, Road, Area, Thana, District (Bangla or English supported)"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-4 py-3 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                  Optional Notes
                </label>
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred delivery window or tailoring instructions"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-4 py-3 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.16em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2.5 disabled:opacity-60 min-h-[50px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{submitting ? 'Preparing Order...' : 'Confirm Order via WhatsApp'}</span>
              </button>
            </form>
          ) : (
            <div className="bg-white border border-[#173D32] p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#B99A61]">
                  Step 2 of 2 · Send in WhatsApp
                </p>
                <h2 className="font-serif text-2xl font-semibold text-[#242424]">
                  Your WhatsApp Order Message Is Ready
                </h2>
                <p className="text-sm text-[#5A5853] leading-relaxed">
                  Click the button below to open WhatsApp with your pre-filled order.{' '}
                  <strong className="text-[#242424]">
                    Please remember to press Send inside WhatsApp
                  </strong>{' '}
                  — your order is only finalized once our team receives your message.
                </p>
              </div>

              <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A5853]">
                    Message Preview ({preparedOrder.referenceCode})
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#173D32] hover:underline"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMessage ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-[#242424] leading-relaxed max-h-60 overflow-y-auto">
                  {preparedOrder.message}
                </pre>
              </div>

              <div className="space-y-3 pt-1">
                <a
                  href={preparedOrder.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors flex items-center justify-center gap-2.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp & Send Order</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleConfirmSentInWhatsApp}
                  className="w-full py-3.5 px-6 border border-[#173D32] text-[#173D32] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#F5F0E7] transition-colors"
                >
                  I Have Sent My Order in WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => setPreparedOrder(null)}
                  className="w-full py-2 text-xs text-[#5A5853] hover:text-[#242424] underline underline-offset-4"
                >
                  Edit delivery details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Itemized Summary + VIP Membership Code */}
        <aside className="lg:col-span-5 bg-[#F5F0E7] border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
          <h2 className="font-serif text-2xl font-semibold text-[#242424]">Order Items</h2>

          <ul className="divide-y divide-[#E4DDD0] border-t border-b border-[#E4DDD0]">
            {checkoutItems.map((item) => (
              <li key={item.id} className="py-4 flex gap-3.5">
                <div className="w-16 h-20 shrink-0 bg-white border border-[#E4DDD0] overflow-hidden">
                  <SafeImage
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#242424] line-clamp-1">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-[#5A5853] mt-0.5">
                    {item.colour} · Size {item.size} · Qty {item.quantity}
                  </p>
                  <p className="text-xs font-medium text-[#173D32] mt-1.5 tabular-nums">
                    {formatPrice(item.unit_price, settings.currency_symbol)} × {item.quantity} ={' '}
                    <span className="font-semibold">
                      {formatPrice(item.unit_price * item.quantity, settings.currency_symbol)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* VIP Membership Code Entry */}
          {!preparedOrder && (
            <div className="bg-white border border-[#E4DDD0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="vip-code-input"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[#173D32] flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5 text-[#B99A61]" />
                  <span>Have a VIP Membership Code?</span>
                </label>
                <Link
                  href="/membership"
                  className="text-[11px] font-medium text-[#B99A61] hover:underline"
                >
                  Join VIP
                </Link>
              </div>

              {!appliedVip ? (
                <form onSubmit={handleApplyMembershipCode} className="flex gap-2">
                  <input
                    id="vip-code-input"
                    type="text"
                    value={membershipCodeInput}
                    onChange={(e) => setMembershipCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter your Membership Code"
                    className="flex-1 min-w-0 border border-[#D8CFC0] bg-[#FAF9F6] px-3 py-2 text-xs font-mono uppercase text-[#242424] focus:outline-none focus:border-[#173D32]"
                  />
                  <button
                    type="submit"
                    disabled={validatingCode}
                    className="px-4 py-2 bg-[#173D32] text-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-[#102B23] shrink-0 disabled:opacity-60"
                  >
                    {validatingCode ? 'Checking...' : 'Apply Code'}
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-[#F5F0E7] border border-[#173D32] px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-[#173D32] font-semibold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      <span className="font-mono">{appliedVip.code}</span> · {appliedVip.discountPercentage}% OFF Applied
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveMembershipCode}
                    aria-label="Remove membership code"
                    className="text-[#5A5853] hover:text-[#991B1B] p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {membershipError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[11px] font-medium text-[#991B1B]"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{membershipError}</span>
                </div>
              )}
            </div>
          )}

          {/* Price Breakdown */}
          <div className="space-y-2 border-b border-[#E4DDD0] pb-4 text-xs">
            <div className="flex justify-between text-[#5A5853] tabular-nums">
              <span>Product Subtotal</span>
              <span>{formatPrice(regularSubtotal, settings.currency_symbol)}</span>
            </div>

            {offerEvaluation.applied_offers.map((offer) => (
              <div key={offer.offer_id} className="flex justify-between text-[#173D32] font-medium">
                <span className="flex items-center gap-1.5 pr-2">
                  <Tag className="w-3.5 h-3.5 text-[#B99A61] shrink-0" />
                  <span>{offer.offer_name}</span>
                </span>
                {offer.discount_amount > 0 && (
                  <span className="tabular-nums shrink-0">
                    -{formatPrice(offer.discount_amount, settings.currency_symbol)}
                  </span>
                )}
              </div>
            ))}

            {offerEvaluation.free_items.map((bonus, idx) => (
              <div key={`${bonus.product_id}-${idx}`} className="flex items-start gap-1.5 text-[#173D32] font-medium">
                <Gift className="w-3.5 h-3.5 text-[#B99A61] shrink-0 mt-0.5" />
                <span>
                  Complimentary: {bonus.quantity}× {bonus.product_name}
                </span>
              </div>
            ))}

            {appliedVip && vipDiscountAmount > 0 && !preparedOrder && (
              <div className="flex justify-between text-[#173D32] font-semibold tabular-nums">
                <span className="flex items-center gap-1.5 pr-2">
                  <Award className="w-3.5 h-3.5 text-[#B99A61] shrink-0" />
                  <span>VIP Membership Discount ({appliedVip.discountPercentage}%)</span>
                </span>
                <span>-{formatPrice(vipDiscountAmount, settings.currency_symbol)}</span>
              </div>
            )}

            {preparedOrder && preparedOrder.membershipDiscount > 0 && (
              <div className="flex justify-between text-[#173D32] font-semibold tabular-nums">
                <span className="flex items-center gap-1.5 pr-2">
                  <Award className="w-3.5 h-3.5 text-[#B99A61] shrink-0" />
                  <span>VIP Membership Discount ({preparedOrder.membershipCode})</span>
                </span>
                <span>-{formatPrice(preparedOrder.membershipDiscount, settings.currency_symbol)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-[#242424]">Final Product Total</span>
              <span className="text-2xl font-semibold text-[#173D32] tabular-nums">
                {formatPrice(preparedOrder ? preparedOrder.totalAmount : grandTotal, settings.currency_symbol)}
              </span>
            </div>
            <p className="text-xs text-[#5A5853] leading-relaxed pt-2">
              {settings.delivery_info} Delivery charges are calculated separately and are not subject to membership discounts.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
