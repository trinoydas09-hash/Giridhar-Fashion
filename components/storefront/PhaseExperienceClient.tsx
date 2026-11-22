'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gift, Layers, MessageCircle, PackagePlus, Sparkles } from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';
import { BrandExperienceFeature, Product, StoreSettings, SurpriseBox } from '@/types/store';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

export function PhaseExperienceClient({
  feature,
  products,
  surpriseBoxes,
  settings,
}: {
  feature: BrandExperienceFeature;
  products: Product[];
  surpriseBoxes: SurpriseBox[];
  settings: StoreSettings;
}) {
  const { addItem, addSurpriseBoxItem } = useCart();

  // Gift Someone state
  const [giftProductId, setGiftProductId] = useState(products[0]?.id || '');
  const [recipientName, setRecipientName] = useState('');
  const [occasion, setOccasion] = useState('Birthday');
  const [giftNote, setGiftNote] = useState('');

  // Gift Card state
  const [cardAmount, setCardAmount] = useState(3000);
  const [cardRecipient, setCardRecipient] = useState('');
  const [cardMessage, setCardMessage] = useState('');

  // Wardrobe Refresh state
  const [budgetTier, setBudgetTier] = useState<'essential' | 'signature' | 'atelier'>('signature');
  const [wardrobeAdded, setWardrobeAdded] = useState(false);

  // Mystery Add-on state
  const [addonSize, setAddonSize] = useState('M');
  const [addonStyle, setAddonStyle] = useState('Minimal Everyday');

  const sanitizedWa = useMemo(
    () => sanitizeWhatsAppNumber(settings.whatsapp_number),
    [settings.whatsapp_number]
  );

  const selectedGiftProduct = useMemo(
    () => products.find((p) => p.id === giftProductId) || products[0],
    [products, giftProductId]
  );

  const capsuleProducts = useMemo(() => {
    const limit = budgetTier === 'essential' ? 2 : budgetTier === 'signature' ? 3 : 4;
    const sorted = [...products].sort((a, b) =>
      budgetTier === 'essential' ? a.price - b.price : b.price - a.price
    );
    return sorted.slice(0, limit);
  }, [products, budgetTier]);

  const capsuleTotal = useMemo(
    () => capsuleProducts.reduce((sum, p) => sum + p.price, 0),
    [capsuleProducts]
  );

  const handleAddCapsuleToBag = () => {
    for (const prod of capsuleProducts) {
      const variant =
        prod.variants.find((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0) ||
        prod.variants[0];
      if (variant) addItem(prod, variant, 1);
    }
    setWardrobeAdded(true);
    setTimeout(() => setWardrobeAdded(false), 2000);
  };

  if (feature.feature_key === 'gift_someone') {
    const waText = `Hello ${settings.brand_name}!\n\nI would like to send a GIRIDHAR GIFT SOMEONE package.\nSelected Garment: ${selectedGiftProduct?.name || 'Menswear Piece'}\nRecipient Name: ${recipientName || 'To be confirmed'}\nOccasion: ${occasion}\nHandwritten Gift Card Note: ${giftNote || 'Warmest regards'}\n\nPlease guide me with gift wrapping and delivery confirmation.`;
    const waHref = sanitizedWa ? `https://wa.me/${sanitizedWa}?text=${encodeURIComponent(waText)}` : '';

    return (
      <div className="bg-[#FAF9F6]">
        <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30 py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-2">
              {settings.brand_name} Bespoke Gifting
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6]">
              {feature.feature_name}
            </h1>
            <p className="mt-4 text-base text-[#F5F0E7]/85 max-w-2xl leading-relaxed">
              {feature.description}
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 bg-white border border-[#E4DDD0] p-7 sm:p-9 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#173D32]">
              <Gift className="w-4 h-4 text-[#B99A61]" />
              <span>Compose Gift Dispatch</span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                Select Garment Piece
              </label>
              <select
                value={giftProductId}
                onChange={(e) => setGiftProductId(e.target.value)}
                className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatPrice(p.price, settings.currency_symbol)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient's full name"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
                >
                  <option value="Birthday">Birthday</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Eid Celebration">Eid Celebration</option>
                  <option value="Corporate Milestone">Corporate Milestone</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                Handwritten Card Message
              </label>
              <textarea
                rows={3}
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="Write a personal note for the recipient..."
                className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
              />
            </div>

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Arrange Gift Order via WhatsApp</span>
              </a>
            ) : (
              <Link
                href="/shop"
                className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase inline-flex items-center justify-center gap-2"
              >
                <span>Browse All Giftable Pieces</span>
              </Link>
            )}
          </div>

          {selectedGiftProduct && (
            <div className="lg:col-span-6 bg-[#F5F0E7] border border-[#E4DDD0] p-7 sm:p-9 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B99A61]">
                Selected Gift Preview
              </p>
              <div className="aspect-[4/3] bg-white border border-[#E4DDD0] overflow-hidden">
                <SafeImage
                  src={selectedGiftProduct.images[0]?.url || '/images/experiences/coming-soon-gift.svg'}
                  alt={selectedGiftProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl font-semibold text-[#242424]">
                  {selectedGiftProduct.name}
                </h2>
                <span className="text-lg font-semibold text-[#173D32] tabular-nums">
                  {formatPrice(selectedGiftProduct.price, settings.currency_symbol)}
                </span>
              </div>
              <p className="text-sm text-[#5A5853] leading-relaxed">
                {selectedGiftProduct.short_description}
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (feature.feature_key === 'mystery_addon') {
    const starterBox = surpriseBoxes[0];
    return (
      <div className="bg-[#FAF9F6]">
        <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30 py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-2">
              Curated Bag Pairing
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6]">
              {feature.feature_name}
            </h1>
            <p className="mt-4 text-base text-[#F5F0E7]/85 max-w-2xl leading-relaxed">
              {feature.description}
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {starterBox ? (
            <div className="bg-white border border-[#E4DDD0] grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-5 bg-[#F5F0E7] border-b md:border-b-0 md:border-r border-[#E4DDD0]">
                <SafeImage
                  src="/images/experiences/coming-soon-addon.svg"
                  alt={feature.feature_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-7 sm:p-9 space-y-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#B99A61]">
                    <PackagePlus className="w-4 h-4" />
                    <span>Studio Surprise Pairing</span>
                  </div>
                  <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                    {starterBox.name}
                  </h2>
                  <p className="text-xl font-semibold text-[#173D32] tabular-nums">
                    {formatPrice(starterBox.price, settings.currency_symbol)}
                  </p>
                  <p className="text-sm text-[#5A5853] leading-relaxed">
                    {starterBox.selection_rules_note}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5">Size</label>
                    <select
                      value={addonSize}
                      onChange={(e) => setAddonSize(e.target.value)}
                      className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3 py-2 text-sm"
                    >
                      {starterBox.available_sizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5">Direction</label>
                    <select
                      value={addonStyle}
                      onChange={(e) => setAddonStyle(e.target.value)}
                      className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3 py-2 text-sm"
                    >
                      {starterBox.preference_options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addSurpriseBoxItem(starterBox, addonSize, addonStyle, 1)}
                  className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors"
                >
                  Add Mystery Pairing to Bag
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E4DDD0] p-8 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em]"
              >
                <span>Explore Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (feature.feature_key === 'wardrobe_refresh') {
    return (
      <div className="bg-[#FAF9F6]">
        <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30 py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-2">
                Seasonal Capsule Planner
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6]">
                {feature.feature_name}
              </h1>
              <p className="mt-4 text-base text-[#F5F0E7]/85 max-w-2xl leading-relaxed">
                {feature.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['essential', 'signature', 'atelier'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setBudgetTier(tier)}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] border transition-colors ${
                    budgetTier === tier
                      ? 'bg-[#B99A61] text-[#173D32] border-[#B99A61]'
                      : 'border-[#F5F0E7]/35 text-[#F5F0E7] hover:border-[#F5F0E7]'
                  }`}
                >
                  {tier === 'essential' ? '2-Piece Edit' : tier === 'signature' ? '3-Piece Rotation' : '4-Piece Complete'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
          <div className="bg-[#F5F0E7] border border-[#E4DDD0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B99A61] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Recommended Capsule ({capsuleProducts.length} Pieces)</span>
              </p>
              <p className="font-serif text-2xl font-semibold text-[#242424] tabular-nums">
                Estimated Capsule Total: {formatPrice(capsuleTotal, settings.currency_symbol)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCapsuleToBag}
              className="px-6 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center gap-2 shrink-0"
            >
              {wardrobeAdded ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{wardrobeAdded ? 'Added Capsule to Bag' : 'Add Full Capsule to Bag'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {capsuleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currencySymbol={settings.currency_symbol}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // gift_card
  const giftCardWaText = `Hello ${settings.brand_name}!\n\nI would like to request a GIRIDHAR GIFT CARD.\nDenomination: ${settings.currency_symbol}${cardAmount}\nRecipient Name: ${cardRecipient || 'To be confirmed'}\nPersonal Note: ${cardMessage || 'Warmest wishes'}\n\nPlease share digital gift card payment and activation details.`;
  const giftCardWaHref = sanitizedWa
    ? `https://wa.me/${sanitizedWa}?text=${encodeURIComponent(giftCardWaText)}`
    : '';

  return (
    <div className="bg-[#FAF9F6]">
      <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-2">
            Digital Menswear Vouchers
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6]">
            {feature.feature_name}
          </h1>
          <p className="mt-4 text-base text-[#F5F0E7]/85 max-w-2xl leading-relaxed">
            {feature.description}
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-[#F5F0E7] border border-[#E4DDD0] p-6 space-y-4">
          <div className="aspect-[4/3] overflow-hidden border border-[#E4DDD0]">
            <SafeImage
              src="/images/experiences/coming-soon-giftcard.svg"
              alt="GIRIDHAR Gift Card"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="font-serif text-2xl font-semibold text-[#173D32] tabular-nums">
            Value: {formatPrice(cardAmount, settings.currency_symbol)}
          </p>
          <p className="text-xs text-[#5A5853] leading-relaxed">
            Gift cards are issued and activated manually by our Dhaka concierge once confirmation
            and payment are verified in WhatsApp.
          </p>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E4DDD0] p-7 sm:p-9 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2.5">
              Select Denomination
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[1500, 3000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCardAmount(amt)}
                  className={`py-2.5 px-3 border text-xs font-semibold tabular-nums transition-colors ${
                    cardAmount === amt
                      ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                      : 'bg-white text-[#242424] border-[#D8CFC0] hover:border-[#173D32]'
                  }`}
                >
                  {formatPrice(amt, settings.currency_symbol)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Recipient Name
            </label>
            <input
              type="text"
              value={cardRecipient}
              onChange={(e) => setCardRecipient(e.target.value)}
              placeholder="Recipient name"
              className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Optional Gift Message
            </label>
            <textarea
              rows={3}
              value={cardMessage}
              onChange={(e) => setCardMessage(e.target.value)}
              placeholder="Personal greeting..."
              className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
            />
          </div>

          {giftCardWaHref && (
            <a
              href={giftCardWaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Request Gift Card via WhatsApp</span>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
