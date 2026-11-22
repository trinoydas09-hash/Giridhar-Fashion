'use client';

import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Tag, Trash2, Upload } from 'lucide-react';
import { OFFER_TYPE_LABELS } from '@/lib/offers/engine';
import { formatPrice } from '@/lib/utils/format';
import { Category, Offer, OfferType, Product } from '@/types/store';
import { SafeImage } from '@/components/storefront/SafeImage';

function createEmptyOffer(): Partial<Offer> {
  return {
    name: '',
    description: '',
    offer_type: 'percentage_discount',
    badge_text: '',
    eligible_product_ids: [],
    eligible_category_ids: [],
    min_quantity: 1,
    get_free_quantity: 0,
    free_product_id: null,
    discount_percentage: 10,
    discount_amount: null,
    special_bundle_price: null,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '2027-06-30',
    banner_image_url: '/images/banners/promo-tailoring.svg',
    is_active: true,
  };
}

export function AdminOffersManager({
  offers,
  products,
  categories,
  currencySymbol,
  token,
  onUploadImage,
  onRefresh,
  onNotice,
}: {
  offers: Offer[];
  products: Product[];
  categories: Category[];
  currencySymbol: string;
  token: string;
  onUploadImage: (file: File) => Promise<string | null>;
  onRefresh: () => Promise<void>;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [form, setForm] = useState<Partial<Offer>>(createEmptyOffer);
  const [productFilter, setProductFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [products, productFilter]);

  const handleOfferTypeChange = (nextType: OfferType) => {
    const defaults: Partial<Offer> = { offer_type: nextType };
    if (nextType === 'bogo_free') {
      defaults.min_quantity = 1;
      defaults.get_free_quantity = 1;
    } else if (nextType === 'buy_2_get_1') {
      defaults.min_quantity = 2;
      defaults.get_free_quantity = 1;
    } else if (nextType === 'buy_x_get_y') {
      defaults.min_quantity = Math.max(2, form.min_quantity || 3);
      defaults.get_free_quantity = Math.max(1, form.get_free_quantity || 1);
    } else if (nextType === 'buy_2_special_price') {
      defaults.min_quantity = 2;
      defaults.get_free_quantity = 0;
      defaults.special_bundle_price = form.special_bundle_price ?? 1990;
    } else if (nextType === 'buy_3_special_price') {
      defaults.min_quantity = 3;
      defaults.get_free_quantity = 0;
      defaults.special_bundle_price = form.special_bundle_price ?? 2990;
    } else if (nextType === 'bundle_combo') {
      defaults.min_quantity = Math.max(2, form.min_quantity || 2);
      defaults.special_bundle_price = form.special_bundle_price ?? 4500;
    } else if (nextType === 'percentage_discount') {
      defaults.min_quantity = form.min_quantity || 1;
      defaults.discount_percentage = form.discount_percentage ?? 10;
    } else if (nextType === 'fixed_discount') {
      defaults.min_quantity = form.min_quantity || 1;
      defaults.discount_amount = form.discount_amount ?? 300;
    }
    setForm((prev) => ({ ...prev, ...defaults }));
  };

  const toggleProductEligibility = (productId: string) => {
    const current = form.eligible_product_ids || [];
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    setForm((prev) => ({ ...prev, eligible_product_ids: next }));
  };

  const toggleCategoryEligibility = (categoryId: string) => {
    const current = form.eligible_category_ids || [];
    const next = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    setForm((prev) => ({ ...prev, eligible_category_ids: next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name: form.name || '',
        description: form.description || '',
        offer_type: form.offer_type || 'percentage_discount',
        badge_text: form.badge_text || '',
        eligible_product_ids: form.eligible_product_ids || [],
        eligible_category_ids: form.eligible_category_ids || [],
        min_quantity: Number(form.min_quantity) || 1,
        get_free_quantity: Number(form.get_free_quantity) || 0,
        free_product_id: form.free_product_id || null,
        discount_percentage:
          form.discount_percentage !== null && form.discount_percentage !== undefined
            ? Number(form.discount_percentage)
            : null,
        discount_amount:
          form.discount_amount !== null && form.discount_amount !== undefined
            ? Number(form.discount_amount)
            : null,
        special_bundle_price:
          form.special_bundle_price !== null && form.special_bundle_price !== undefined
            ? Number(form.special_bundle_price)
            : null,
        start_date: form.start_date || new Date().toISOString().slice(0, 10),
        end_date: form.end_date || '2027-06-30',
        banner_image_url: form.banner_image_url || null,
        is_active: Boolean(form.is_active),
      };

      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Could not save promotional offer.');
        return;
      }

      onNotice('ok', `${form.id ? 'Updated' : 'Created'} offer: ${data.offer.name}`);
      setForm(createEmptyOffer());
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving promotional offer.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...offer,
          is_active: !offer.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Failed to update offer status.');
        return;
      }
      onNotice(
        'ok',
        `${offer.name} is now ${!offer.is_active ? 'active' : 'inactive'}.`
      );
      await onRefresh();
    } catch {
      onNotice('err', 'Network error updating offer.');
    }
  };

  const handleDelete = async (offer: Offer) => {
    try {
      const res = await fetch(`/api/admin/offers?id=${encodeURIComponent(offer.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onNotice('err', 'Failed to delete offer.');
        return;
      }
      if (form.id === offer.id) {
        setForm(createEmptyOffer());
      }
      onNotice('ok', `Deleted offer: ${offer.name}`);
      await onRefresh();
    } catch {
      onNotice('err', 'Network error deleting offer.');
    }
  };

  const offerType = form.offer_type || 'percentage_discount';
  const showFreeFields =
    offerType === 'bogo_free' ||
    offerType === 'buy_2_get_1' ||
    offerType === 'buy_x_get_y' ||
    offerType === 'custom_promo';
  const showSpecialPrice =
    offerType === 'buy_2_special_price' ||
    offerType === 'buy_3_special_price' ||
    offerType === 'bundle_combo' ||
    offerType === 'custom_promo';
  const showPercentage = offerType === 'percentage_discount' || offerType === 'custom_promo';
  const showFixed = offerType === 'fixed_discount' || offerType === 'custom_promo';

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DDD0] pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              {form.id ? 'Edit Offer or Combo' : 'Create Promotional Offer or Combo'}
            </h2>
            <p className="text-xs text-[#5A5853] mt-0.5">
              Configured offers compute automatic cart discounts, bonus items, product card badges,
              and AI Shopping Assistant context.
            </p>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(createEmptyOffer())}
              className="px-3.5 py-2 border border-[#D8CFC0] text-xs font-semibold text-[#242424]"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Offer Name *</label>
            <input
              type="text"
              required
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Tailored Tees: 2 for ৳1,990"
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Offer Type *</label>
            <select
              value={offerType}
              onChange={(e) => handleOfferTypeChange(e.target.value as OfferType)}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
            >
              {(Object.keys(OFFER_TYPE_LABELS) as OfferType[]).map((key) => (
                <option key={key} value={key}>
                  {OFFER_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">
              Product Card Badge Text
            </label>
            <input
              type="text"
              maxLength={40}
              value={form.badge_text || ''}
              onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
              placeholder="e.g. 2 for ৳1,990 or Buy 2 Get 1"
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase mb-1">Offer Description</label>
          <textarea
            rows={2}
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe eligibility rules and how customers benefit..."
            className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
          />
        </div>

        {/* Dynamic Rule Configuration */}
        <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#173D32]">
            Offer Calculation Rules
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Minimum Purchase Qty
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.min_quantity ?? 1}
                onChange={(e) =>
                  setForm({ ...form, min_quantity: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            {showFreeFields && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">
                    Free Bonus Qty (Y)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={form.get_free_quantity ?? 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        get_free_quantity: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase mb-1">
                    Free Product Selection (Optional)
                  </label>
                  <select
                    value={form.free_product_id || ''}
                    onChange={(e) =>
                      setForm({ ...form, free_product_id: e.target.value || null })
                    }
                    className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm"
                  >
                    <option value="">Same / lowest-priced eligible item in bag</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.price, currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {showSpecialPrice && (
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Special Bundle Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.special_bundle_price ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      special_bundle_price:
                        e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                    })
                  }
                  placeholder="e.g. 1990"
                  className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            )}

            {showPercentage && (
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={95}
                  value={form.discount_percentage ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount_percentage:
                        e.target.value === '' ? null : Math.min(95, Math.max(0, Number(e.target.value))),
                    })
                  }
                  placeholder="e.g. 10"
                  className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            )}

            {showFixed && (
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Fixed Discount ({currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.discount_amount ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount_amount:
                        e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                    })
                  }
                  placeholder="e.g. 500"
                  className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-[#E4DDD0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-[#242424]">
                Eligible Categories ({(form.eligible_category_ids || []).length})
              </p>
              {(form.eligible_category_ids || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, eligible_category_ids: [] })}
                  className="text-[11px] text-[#5A5853] underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
              {categories.map((cat) => {
                const checked = (form.eligible_category_ids || []).includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 px-2.5 py-2 border text-xs cursor-pointer ${
                      checked
                        ? 'bg-[#173D32]/5 border-[#173D32] text-[#173D32] font-medium'
                        : 'border-[#E4DDD0] text-[#5A5853]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategoryEligibility(cat.id)}
                    />
                    <span className="truncate">{cat.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border border-[#E4DDD0] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[#242424]">
                Eligible Products ({(form.eligible_product_ids || []).length})
              </p>
              <input
                type="search"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Filter products..."
                className="border border-[#D8CFC0] px-2.5 py-1 text-xs w-44"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
              {filteredProducts.map((prod) => {
                const checked = (form.eligible_product_ids || []).includes(prod.id);
                return (
                  <label
                    key={prod.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 border text-xs cursor-pointer ${
                      checked
                        ? 'bg-[#173D32]/5 border-[#173D32] text-[#173D32] font-medium'
                        : 'border-[#E4DDD0] text-[#5A5853]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProductEligibility(prod.id)}
                      />
                      <span className="truncate">{prod.name}</span>
                    </span>
                    <span className="tabular-nums shrink-0 text-[11px]">
                      {formatPrice(prod.price, currencySymbol)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-[#7A756D]">
              Leave both Categories and Products empty for a storewide offer.
            </p>
          </div>
        </div>

        {/* Dates, Banner & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={form.start_date || ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Expiry Date *</label>
            <input
              type="date"
              required
              value={form.end_date || ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Banner Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.banner_image_url || ''}
                onChange={(e) => setForm({ ...form, banner_image_url: e.target.value })}
                className="flex-1 border border-[#D8CFC0] px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center justify-center px-3 py-2 border border-[#173D32] text-[#173D32] cursor-pointer text-xs font-semibold">
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await onUploadImage(f);
                    if (url) setForm((prev) => ({ ...prev, banner_image_url: url }));
                  }}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2.5 px-4 py-2.5 bg-[#F5F0E7] border border-[#E4DDD0] text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span>Offer Active</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-7 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{saving ? 'Saving Offer...' : form.id ? 'Update Offer' : 'Create Offer'}</span>
        </button>
      </form>

      {/* Configured Offers List */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4DDD0] pb-4">
          <h3 className="font-serif text-xl font-semibold text-[#242424]">
            Configured Offers ({offers.length})
          </h3>
        </div>

        {offers.length === 0 ? (
          <p className="text-sm text-[#5A5853] py-6">
            No offers created yet. Use the form above to build your first combo or promotional rule.
          </p>
        ) : (
          <div className="divide-y divide-[#E4DDD0]">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-16 h-16 bg-[#F5F0E7] border border-[#E4DDD0] shrink-0 overflow-hidden">
                    <SafeImage
                      src={offer.banner_image_url || '/images/banners/promo-tailoring.svg'}
                      alt={offer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#173D32]">
                        {OFFER_TYPE_LABELS[offer.offer_type]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={offer.is_active ? 'text-[#065F46] font-medium' : 'text-[#991B1B]'}>
                        {offer.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {offer.badge_text && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[#B99A61]">
                            <Tag className="w-3 h-3" />
                            {offer.badge_text}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="font-serif text-lg font-semibold text-[#242424] truncate">
                      {offer.name}
                    </p>
                    <p className="text-xs text-[#5A5853] line-clamp-1">{offer.description}</p>
                    <p className="text-[11px] text-[#7A756D] tabular-nums">
                      Valid {offer.start_date} – {offer.end_date} · Min Qty {offer.min_quantity}
                      {offer.special_bundle_price
                        ? ` · Bundle ${formatPrice(offer.special_bundle_price, currencySymbol)}`
                        : ''}
                      {offer.discount_percentage ? ` · ${offer.discount_percentage}% off` : ''}
                      {offer.discount_amount
                        ? ` · ${formatPrice(offer.discount_amount, currencySymbol)} off`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(offer)}
                    className="px-3 py-1.5 border border-[#D8CFC0] text-xs font-medium hover:bg-[#FAF9F6]"
                  >
                    {offer.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...offer });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-medium hover:bg-[#173D32] hover:text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(offer)}
                    aria-label={`Delete ${offer.name}`}
                    className="p-1.5 text-[#991B1B] border border-[#FECACA] hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
