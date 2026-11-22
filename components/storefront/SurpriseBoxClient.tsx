'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  Gift,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { Category, StoreSettings, SurpriseBox } from '@/types/store';
import { SafeImage } from './SafeImage';

export function SurpriseBoxClient({
  boxes,
  categories,
  settings,
}: {
  boxes: SurpriseBox[];
  categories: Category[];
  settings: StoreSettings;
}) {
  const { addSurpriseBoxItem } = useCart();

  const [selectedBoxId, setSelectedBoxId] = useState<string>(boxes[0]?.id || '');
  const selectedBox = useMemo(
    () => boxes.find((b) => b.id === selectedBoxId) || boxes[0] || null,
    [boxes, selectedBoxId]
  );

  const [selectedSize, setSelectedSize] = useState<string>(
    selectedBox?.available_sizes[0] || 'M'
  );
  const [selectedStyle, setSelectedStyle] = useState<string>(
    selectedBox?.preference_options[0] || 'Minimal Tailored'
  );
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const categoryNameMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const handleSelectBox = (box: SurpriseBox) => {
    setSelectedBoxId(box.id);
    setSelectedSize(box.available_sizes[0] || 'M');
    setSelectedStyle(box.preference_options[0] || 'Minimal Tailored');
    setQuantity(1);
    setAddedFeedback(false);
  };

  const handleAddSurpriseBox = () => {
    if (!selectedBox || selectedBox.available_quantity <= 0) return;
    const size = selectedBox.available_sizes.includes(selectedSize)
      ? selectedSize
      : selectedBox.available_sizes[0] || 'M';
    const style = selectedBox.preference_options.includes(selectedStyle)
      ? selectedStyle
      : selectedBox.preference_options[0] || 'Minimal Tailored';
    addSurpriseBoxItem(selectedBox, size, style, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  if (boxes.length === 0 || !selectedBox) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-5">
        <Gift className="w-8 h-8 text-[#173D32] mx-auto" />
        <h1 className="font-serif text-4xl font-semibold text-[#242424]">
          Surprise Boxes Currently Restocking
        </h1>
        <p className="text-sm text-[#5A5853] max-w-md mx-auto">
          Our Banani atelier stylists are assembling our next allocation of Mystery Fashion Boxes.
          Explore our individual menswear pieces in the meantime.
        </p>
        <div>
          <Link
            href="/shop"
            className="inline-block px-7 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.15em]"
          >
            Browse Menswear Collection
          </Link>
        </div>
      </section>
    );
  }

  const includedCategories = selectedBox.included_category_ids
    .map((id) => categoryNameMap.get(id))
    .filter(Boolean) as string[];
  const outOfStock = selectedBox.available_quantity <= 0;

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero Header */}
      <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61]">
              {settings.brand_name} Mystery Wardrobes
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6] leading-[1.08]">
              GIRIDHAR SURPRISE BOX
            </h1>
            <p className="text-base text-[#F5F0E7]/85 leading-relaxed">
              Select a budget tier tailored to your wardrobe goals. Choose your exact garment size
              and style preference, and our Dhaka atelier stylists curate an authentic multi-piece
              menswear box ready for WhatsApp checkout.
            </p>
          </div>
        </div>
      </section>

      {/* Budget Tier Selector Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5A5853]">
            Step 1 · Choose Your Budget Box
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {boxes.map((box) => {
              const isSelected = box.id === selectedBox.id;
              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => handleSelectBox(box)}
                  className={`text-left border p-6 transition-colors flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                      : 'bg-white text-[#242424] border-[#E4DDD0] hover:border-[#173D32]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-semibold uppercase tracking-[0.16em] ${
                          isSelected ? 'text-[#B99A61]' : 'text-[#173D32]'
                        }`}
                      >
                        {box.tier_label}
                      </span>
                      <span
                        className={`tabular-nums ${
                          isSelected ? 'text-[#F5F0E7]/80' : 'text-[#5A5853]'
                        }`}
                      >
                        {box.item_count} Pieces
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl font-semibold">{box.name}</h2>
                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        isSelected ? 'text-[#F5F0E7]/80' : 'text-[#5A5853]'
                      }`}
                    >
                      {box.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-current/15 flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-semibold tabular-nums">
                      {formatPrice(box.price, settings.currency_symbol)}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-wider ${
                        isSelected ? 'text-[#B99A61]' : 'text-[#5A5853]'
                      }`}
                    >
                      {box.available_quantity > 0
                        ? `${box.available_quantity} Boxes Left`
                        : 'Sold Out'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Box Configuration & Add to Bag */}
        <div className="bg-white border border-[#E4DDD0] grid grid-cols-1 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 bg-[#F5F0E7] border-b lg:border-b-0 lg:border-r border-[#E4DDD0]">
            <div className="aspect-[4/3] lg:aspect-square overflow-hidden">
              <SafeImage
                src={selectedBox.image_url || '/images/experiences/surprise-box-standard.svg'}
                alt={selectedBox.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 border-t border-[#E4DDD0] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#173D32]">
                <Package className="w-4 h-4 text-[#B99A61]" />
                <span>Curation Transparency Rules</span>
              </div>
              <p className="text-xs text-[#5A5853] leading-relaxed">
                {selectedBox.selection_rules_note}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 p-7 sm:p-10 space-y-6">
            <div className="border-b border-[#E4DDD0] pb-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5853] uppercase tracking-[0.14em]">
                <span className="font-semibold text-[#173D32]">{selectedBox.tier_label}</span>
                <span>·</span>
                <span className="tabular-nums">{selectedBox.item_count} Curated Items Inside</span>
                {includedCategories.length > 0 && (
                  <>
                    <span>·</span>
                    <span>Eligible: {includedCategories.join(', ')}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-4 pt-1">
                <h2 className="font-serif text-3xl font-semibold text-[#242424]">
                  {selectedBox.name}
                </h2>
                <span className="text-2xl font-semibold text-[#173D32] tabular-nums">
                  {formatPrice(selectedBox.price, settings.currency_symbol)}
                </span>
              </div>

              <p className="text-sm text-[#5A5853] leading-relaxed pt-1">
                {selectedBox.description}
              </p>
            </div>

            {/* Step 2: Select Size */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#242424]">
                Step 2 · Select Garment Size:{' '}
                <span className="font-normal text-[#5A5853]">{selectedSize}</span>
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {selectedBox.available_sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`py-2.5 px-3 border text-xs font-semibold transition-colors min-h-[44px] ${
                      selectedSize === size
                        ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6]'
                        : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Customer Style Preference */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#242424] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B99A61]" />
                <span>Step 3 · Style Direction Preference</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {selectedBox.preference_options.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setSelectedStyle(pref)}
                    className={`px-4 py-2.5 border text-xs transition-colors min-h-[40px] ${
                      selectedStyle === pref
                        ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6] font-semibold'
                        : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Add to Bag */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#242424]">
                Quantity
              </span>
              <div className="inline-flex items-center border border-[#D8CFC0] bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center hover:bg-[#F5F0E7]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(Math.max(1, selectedBox.available_quantity), q + 1))
                  }
                  aria-label="Increase quantity"
                  disabled={outOfStock || quantity >= selectedBox.available_quantity}
                  className="w-10 h-10 flex items-center justify-center hover:bg-[#F5F0E7] disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-[#5A5853] tabular-nums">
                {outOfStock
                  ? 'Currently out of stock'
                  : `${selectedBox.available_quantity} boxes available`}
              </span>
            </div>

            {outOfStock && (
              <div className="flex items-center gap-2 p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This box tier is temporarily sold out. Please select another tier.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddSurpriseBox}
              disabled={outOfStock}
              className="w-full py-4 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.16em] uppercase hover:bg-[#102B23] transition-colors inline-flex items-center justify-center gap-2.5 disabled:opacity-40 min-h-[50px]"
            >
              {addedFeedback ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>
                {addedFeedback
                  ? 'Surprise Box Added to Bag'
                  : `Add ${selectedBox.tier_label} to Bag — ${formatPrice(
                      selectedBox.price * quantity,
                      settings.currency_symbol
                    )}`}
              </span>
            </button>

            <div className="flex items-start gap-2.5 text-xs text-[#5A5853] pt-2 border-t border-[#E4DDD0]">
              <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
              <span>
                Surprise Boxes proceed seamlessly to our WhatsApp Checkout with Cash on Delivery
                across Bangladesh. Because curation is personalized by stylist selection rules,
                individual piece SKUs are revealed upon unboxing.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
