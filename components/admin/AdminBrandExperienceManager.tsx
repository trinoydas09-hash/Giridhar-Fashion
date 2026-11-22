'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  EyeOff,
  Gift,
  Layers,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatPrice, slugify } from '@/lib/utils/format';
import {
  BrandExperienceFeature,
  BrandExperienceFeatureKey,
  BrandExperienceStatus,
  Category,
  HomepageSectionConfig,
  Product,
  StyleGuide,
  SurpriseBox,
} from '@/types/store';

interface AdminBrandExperienceManagerProps {
  features: BrandExperienceFeature[];
  styleGuides: StyleGuide[];
  surpriseBoxes: SurpriseBox[];
  products: Product[];
  categories: Category[];
  sections: HomepageSectionConfig[];
  currencySymbol: string;
  token: string;
  onUploadImage: (file: File) => Promise<string | null>;
  onRefresh: () => Promise<void>;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}

type ManagerSubTab = 'features' | 'style_guides' | 'surprise_boxes';

const EMPTY_GUIDE: Partial<StyleGuide> = {
  title: '',
  slug: '',
  summary: '',
  styling_recommendations: '',
  outfit_combinations: '',
  colour_coordination_tips: '',
  occasion: 'Smart Casual & Gallery Evenings',
  image_url: '/images/experiences/style-guide.svg',
  connected_product_ids: [],
  matching_product_ids: [],
  is_published: true,
  display_order: 1,
};

const EMPTY_BOX: Partial<SurpriseBox> = {
  name: '',
  slug: '',
  tier_label: 'Standard Box',
  price: 2990,
  description: '',
  selection_rules_note:
    'Contents are hand-curated by GIRIDHAR stylists from eligible categories matching your selected size and style preference. Specific SKUs remain a surprise until unboxing.',
  image_url: '/images/experiences/surprise-box-standard.svg',
  included_category_ids: [],
  item_count: 3,
  available_sizes: ['S', 'M', 'L', 'XL'],
  preference_options: ['Minimal Tailored', 'Smart Casual', 'Neutral Earth Tones'],
  available_quantity: 20,
  is_active: true,
  display_order: 1,
};

export function AdminBrandExperienceManager({
  features,
  styleGuides,
  surpriseBoxes,
  products,
  categories,
  sections,
  currencySymbol,
  token,
  onUploadImage,
  onRefresh,
  onNotice,
}: AdminBrandExperienceManagerProps) {
  const [subTab, setSubTab] = useState<ManagerSubTab>('features');
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  // Style Guide state
  const [guideForm, setGuideForm] = useState<Partial<StyleGuide>>(EMPTY_GUIDE);
  const [savingGuide, setSavingGuide] = useState(false);

  // Surprise Box state
  const [boxForm, setBoxForm] = useState<Partial<SurpriseBox>>(EMPTY_BOX);
  const [sizesInput, setSizesInput] = useState('S, M, L, XL');
  const [prefsInput, setPrefsInput] = useState(
    'Minimal Tailored, Smart Casual, Neutral Earth Tones'
  );
  const [savingBox, setSavingBox] = useState(false);

  const experienceSection = sections.find((s) => s.section_key === 'brand_experience');

  const handleToggleExperienceSection = async () => {
    if (!experienceSection) return;
    const updatedSections = sections.map((s) =>
      s.section_key === 'brand_experience' ? { ...s, is_visible: !s.is_visible } : s
    );
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'sections', sections: updatedSections }),
      });
      if (!res.ok) {
        onNotice('err', 'Failed to update homepage Experience section visibility.');
        return;
      }
      onNotice(
        'ok',
        `Homepage "The GIRIDHAR Experience" section ${
          !experienceSection.is_visible ? 'enabled' : 'hidden'
        }.`
      );
      await onRefresh();
    } catch {
      onNotice('err', 'Network error.');
    }
  };

  const handleSetFeatureStatus = async (
    featureKey: BrandExperienceFeatureKey,
    status: BrandExperienceStatus,
    featureName: string
  ) => {
    setUpdatingFeature(featureKey);
    try {
      const res = await fetch('/api/admin/brand-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feature_key: featureKey, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Failed to update feature status.');
        return;
      }
      onNotice('ok', `${featureName} set to ${status.replace('_', ' ')}.`);
      await onRefresh();
    } catch {
      onNotice('err', 'Network error updating feature.');
    } finally {
      setUpdatingFeature(null);
    }
  };

  const toggleProductSelection = (
    field: 'connected_product_ids' | 'matching_product_ids',
    productId: string
  ) => {
    setGuideForm((prev) => {
      const current = prev[field] || [];
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      return { ...prev, [field]: next };
    });
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGuide(true);
    try {
      const res = await fetch('/api/admin/style-guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...guideForm,
          slug: guideForm.slug?.trim() || slugify(guideForm.title || 'style-guide'),
          display_order: Number(guideForm.display_order) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Failed to save style guide.');
        return;
      }
      onNotice('ok', `Saved style guide: ${data.styleGuide.title}`);
      setGuideForm({ ...EMPTY_GUIDE, display_order: styleGuides.length + 1 });
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving style guide.');
    } finally {
      setSavingGuide(false);
    }
  };

  const handleToggleGuidePublish = async (guide: StyleGuide) => {
    const res = await fetch('/api/admin/style-guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...guide, is_published: !guide.is_published }),
    });
    if (res.ok) {
      onNotice('ok', `${guide.title} ${!guide.is_published ? 'published' : 'unpublished'}.`);
      await onRefresh();
    }
  };

  const handleDeleteGuide = async (id: string) => {
    const res = await fetch(`/api/admin/style-guides?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onNotice('ok', 'Style guide deleted.');
      await onRefresh();
    }
  };

  const handleEditBox = (box: SurpriseBox) => {
    setBoxForm(box);
    setSizesInput(box.available_sizes.join(', '));
    setPrefsInput(box.preference_options.join(', '));
  };

  const toggleBoxCategory = (catId: string) => {
    setBoxForm((prev) => {
      const current = prev.included_category_ids || [];
      const next = current.includes(catId)
        ? current.filter((id) => id !== catId)
        : [...current, catId];
      return { ...prev, included_category_ids: next };
    });
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBox(true);
    const parsedSizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPrefs = prefsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/admin/surprise-boxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...boxForm,
          slug: boxForm.slug?.trim() || slugify(boxForm.name || 'surprise-box'),
          price: Number(boxForm.price) || 1990,
          item_count: Number(boxForm.item_count) || 2,
          available_quantity: Number(boxForm.available_quantity) || 0,
          display_order: Number(boxForm.display_order) || 1,
          available_sizes: parsedSizes.length > 0 ? parsedSizes : ['S', 'M', 'L', 'XL'],
          preference_options:
            parsedPrefs.length > 0 ? parsedPrefs : ['Minimal Tailored', 'Smart Casual'],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Failed to save surprise box.');
        return;
      }
      onNotice('ok', `Saved surprise box: ${data.surpriseBox.name}`);
      setBoxForm({ ...EMPTY_BOX, display_order: surpriseBoxes.length + 1 });
      setSizesInput('S, M, L, XL');
      setPrefsInput('Minimal Tailored, Smart Casual, Neutral Earth Tones');
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving surprise box.');
    } finally {
      setSavingBox(false);
    }
  };

  const handleDeleteBox = async (id: string) => {
    const res = await fetch(`/api/admin/surprise-boxes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onNotice('ok', 'Surprise box deleted.');
      await onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white border border-[#E4DDD0] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('features')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition-colors ${
              subTab === 'features'
                ? 'bg-[#173D32] text-[#FAF9F6]'
                : 'border border-[#D8CFC0] text-[#242424] hover:border-[#173D32]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Brand Experience Controls ({features.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('style_guides')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition-colors ${
              subTab === 'style_guides'
                ? 'bg-[#173D32] text-[#FAF9F6]'
                : 'border border-[#D8CFC0] text-[#242424] hover:border-[#173D32]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Style Guides ({styleGuides.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('surprise_boxes')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition-colors ${
              subTab === 'surprise_boxes'
                ? 'bg-[#173D32] text-[#FAF9F6]'
                : 'border border-[#D8CFC0] text-[#242424] hover:border-[#173D32]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Surprise Boxes ({surpriseBoxes.length})</span>
          </button>
        </div>

        {experienceSection && (
          <button
            type="button"
            onClick={handleToggleExperienceSection}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors ${
              experienceSection.is_visible
                ? 'border-[#173D32] bg-[#F5F0E7] text-[#173D32]'
                : 'border-[#D8CFC0] bg-white text-[#5A5853]'
            }`}
          >
            Homepage Section: {experienceSection.is_visible ? 'Visible' : 'Hidden'} (Toggle)
          </button>
        )}
      </div>

      {/* 1. BRAND EXPERIENCE MANAGEMENT FEATURE FLAGS TABLE */}
      {subTab === 'features' && (
        <div className="bg-white border border-[#E4DDD0] overflow-hidden">
          <div className="p-6 border-b border-[#E4DDD0] space-y-1">
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              BRAND EXPERIENCE MANAGEMENT
            </h2>
            <p className="text-xs text-[#5A5853]">
              Control all 8 GIRIDHAR FASHION experience pillars. Switch any feature between full
              functionality, branded Coming Soon mode, or hidden/disabled without code changes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F0E7] border-b border-[#E4DDD0] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A5853]">
                  <th className="py-3.5 px-5">Feature Name</th>
                  <th className="py-3.5 px-4">Phase</th>
                  <th className="py-3.5 px-4">Feature Status</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DDD0] text-sm">
                {features
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((feat) => {
                    const busy = updatingFeature === feat.feature_key;
                    return (
                      <tr key={feat.id} className="hover:bg-[#FAF9F6]">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-[#242424]">{feat.feature_name}</p>
                          <p className="text-xs text-[#5A5853] font-mono mt-0.5">
                            {feat.route_path}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-[#5A5853]">
                          {feat.phase}
                        </td>
                        <td className="py-4 px-4">
                          {feat.status === 'enabled' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D32]">
                              <Check className="w-3.5 h-3.5" />
                              <span>Enabled</span>
                            </span>
                          )}
                          {feat.status === 'coming_soon' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A6B1E]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Coming Soon</span>
                            </span>
                          )}
                          {feat.status === 'disabled' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A756D]">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Disabled</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#5A5853]">
                          {feat.status === 'enabled' && 'Live in Storefront & Nav'}
                          {feat.status === 'coming_soon' && 'Coming Soon Page & Homepage'}
                          {feat.status === 'disabled' && 'Hidden from Customers'}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={busy || feat.status === 'enabled'}
                              onClick={() =>
                                handleSetFeatureStatus(
                                  feat.feature_key,
                                  'enabled',
                                  feat.feature_name
                                )
                              }
                              className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
                                feat.status === 'enabled'
                                  ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                                  : 'border-[#D8CFC0] text-[#173D32] hover:border-[#173D32]'
                              }`}
                            >
                              Enable Feature
                            </button>
                            <button
                              type="button"
                              disabled={busy || feat.status === 'coming_soon'}
                              onClick={() =>
                                handleSetFeatureStatus(
                                  feat.feature_key,
                                  'coming_soon',
                                  feat.feature_name
                                )
                              }
                              className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
                                feat.status === 'coming_soon'
                                  ? 'bg-[#B99A61] text-[#173D32] border-[#B99A61]'
                                  : 'border-[#D8CFC0] text-[#5A5853] hover:border-[#B99A61]'
                              }`}
                            >
                              Coming Soon
                            </button>
                            <button
                              type="button"
                              disabled={busy || feat.status === 'disabled'}
                              onClick={() =>
                                handleSetFeatureStatus(
                                  feat.feature_key,
                                  'disabled',
                                  feat.feature_name
                                )
                              }
                              className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
                                feat.status === 'disabled'
                                  ? 'bg-[#242424] text-[#FAF9F6] border-[#242424]'
                                  : 'border-[#D8CFC0] text-[#991B1B] hover:border-[#991B1B]'
                              }`}
                            >
                              Disable Feature
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. STYLE GUIDES CRUD */}
      {subTab === 'style_guides' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveGuide}
            className="lg:col-span-5 bg-white border border-[#E4DDD0] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-[#242424]">
                {guideForm.id ? 'Edit Style Guide' : 'Add Style Guide'}
              </h3>
              {guideForm.id && (
                <button
                  type="button"
                  onClick={() => setGuideForm(EMPTY_GUIDE)}
                  className="text-xs text-[#173D32] underline"
                >
                  New Guide
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Guide Title *</label>
              <input
                type="text"
                required
                value={guideForm.title || ''}
                onChange={(e) => setGuideForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Occasion *</label>
                <input
                  type="text"
                  required
                  value={guideForm.occasion || ''}
                  onChange={(e) => setGuideForm((p) => ({ ...p, occasion: e.target.value }))}
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={guideForm.display_order ?? 1}
                  onChange={(e) =>
                    setGuideForm((p) => ({ ...p, display_order: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-xs tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Editorial Summary *</label>
              <textarea
                rows={2}
                required
                value={guideForm.summary || ''}
                onChange={(e) => setGuideForm((p) => ({ ...p, summary: e.target.value }))}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Styling Recommendations *
              </label>
              <textarea
                rows={2}
                required
                value={guideForm.styling_recommendations || ''}
                onChange={(e) =>
                  setGuideForm((p) => ({ ...p, styling_recommendations: e.target.value }))
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Outfit Combination Suggestions *
              </label>
              <textarea
                rows={2}
                required
                value={guideForm.outfit_combinations || ''}
                onChange={(e) =>
                  setGuideForm((p) => ({ ...p, outfit_combinations: e.target.value }))
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Colour Coordination Tips *
              </label>
              <textarea
                rows={2}
                required
                value={guideForm.colour_coordination_tips || ''}
                onChange={(e) =>
                  setGuideForm((p) => ({ ...p, colour_coordination_tips: e.target.value }))
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase">Inspiration Image *</label>
                <label className="text-xs font-semibold text-[#173D32] cursor-pointer hover:underline inline-flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await onUploadImage(f);
                      if (url) setGuideForm((p) => ({ ...p, image_url: url }));
                    }}
                  />
                </label>
              </div>
              <input
                type="text"
                required
                value={guideForm.image_url || ''}
                onChange={(e) => setGuideForm((p) => ({ ...p, image_url: e.target.value }))}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-2 border-t border-[#E4DDD0] pt-3">
              <p className="text-xs font-semibold uppercase">Connect Guide to Products</p>
              <div className="max-h-36 overflow-y-auto border border-[#E4DDD0] p-2.5 space-y-1.5">
                {products.map((prod) => (
                  <label key={prod.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(guideForm.connected_product_ids || []).includes(prod.id)}
                      onChange={() => toggleProductSelection('connected_product_ids', prod.id)}
                    />
                    <span className="truncate">{prod.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase">Matching Product Recommendations</p>
              <div className="max-h-36 overflow-y-auto border border-[#E4DDD0] p-2.5 space-y-1.5">
                {products.map((prod) => (
                  <label key={prod.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(guideForm.matching_product_ids || []).includes(prod.id)}
                      onChange={() => toggleProductSelection('matching_product_ids', prod.id)}
                    />
                    <span className="truncate">{prod.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={guideForm.is_published ?? true}
                onChange={(e) =>
                  setGuideForm((p) => ({ ...p, is_published: e.target.checked }))
                }
              />
              <span>Published on Storefront</span>
            </label>

            <button
              type="submit"
              disabled={savingGuide}
              className="w-full py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {savingGuide
                  ? 'Saving...'
                  : guideForm.id
                  ? 'Update Style Guide'
                  : 'Create Style Guide'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#E4DDD0] divide-y divide-[#E4DDD0]">
            {styleGuides.length === 0 ? (
              <p className="p-6 text-xs text-[#5A5853]">No style guides created yet.</p>
            ) : (
              styleGuides.map((guide) => (
                <div key={guide.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={guide.image_url}
                      alt=""
                      className="w-20 h-16 object-cover bg-[#F5F0E7] border border-[#E4DDD0] shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#B99A61]">
                        {guide.occasion} · {guide.is_published ? 'Published' : 'Draft'}
                      </p>
                      <p className="font-serif text-lg font-semibold text-[#242424] truncate">
                        {guide.title}
                      </p>
                      <p className="text-xs text-[#5A5853] line-clamp-2">{guide.summary}</p>
                      <p className="text-[11px] text-[#7A756D]">
                        Connected: {guide.connected_product_ids.length} · Matching:{' '}
                        {guide.matching_product_ids.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleGuidePublish(guide)}
                      className="px-2.5 py-1.5 border border-[#D8CFC0] text-[11px] font-medium"
                    >
                      {guide.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideForm(guide)}
                      className="px-2.5 py-1.5 border border-[#D8CFC0] text-[11px] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGuide(guide.id)}
                      className="p-1.5 text-[#991B1B] border border-[#FECACA]"
                      aria-label={`Delete ${guide.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. SURPRISE BOXES CRUD */}
      {subTab === 'surprise_boxes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveBox}
            className="lg:col-span-5 bg-white border border-[#E4DDD0] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-[#242424]">
                {boxForm.id ? 'Edit Surprise Box' : 'Add Surprise Box'}
              </h3>
              {boxForm.id && (
                <button
                  type="button"
                  onClick={() => {
                    setBoxForm(EMPTY_BOX);
                    setSizesInput('S, M, L, XL');
                    setPrefsInput('Minimal Tailored, Smart Casual, Neutral Earth Tones');
                  }}
                  className="text-xs text-[#173D32] underline"
                >
                  New Box
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Box Name *</label>
                <input
                  type="text"
                  required
                  value={boxForm.name || ''}
                  onChange={(e) => setBoxForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Budget Tier Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budget Box"
                  value={boxForm.tier_label || ''}
                  onChange={(e) => setBoxForm((p) => ({ ...p, tier_label: e.target.value }))}
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Price ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={boxForm.price ?? 1990}
                  onChange={(e) => setBoxForm((p) => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Items Inside *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={boxForm.item_count ?? 2}
                  onChange={(e) =>
                    setBoxForm((p) => ({ ...p, item_count: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Available Qty *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={boxForm.available_quantity ?? 10}
                  onChange={(e) =>
                    setBoxForm((p) => ({ ...p, available_quantity: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Box Description *</label>
              <textarea
                rows={2}
                required
                value={boxForm.description || ''}
                onChange={(e) => setBoxForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Curation Rules Disclosure *
              </label>
              <textarea
                rows={2}
                required
                value={boxForm.selection_rules_note || ''}
                onChange={(e) =>
                  setBoxForm((p) => ({ ...p, selection_rules_note: e.target.value }))
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase">Box Image *</label>
                <label className="text-xs font-semibold text-[#173D32] cursor-pointer hover:underline inline-flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await onUploadImage(f);
                      if (url) setBoxForm((p) => ({ ...p, image_url: url }));
                    }}
                  />
                </label>
              </div>
              <input
                type="text"
                required
                value={boxForm.image_url || ''}
                onChange={(e) => setBoxForm((p) => ({ ...p, image_url: e.target.value }))}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase">Included Product Categories</p>
              <div className="max-h-32 overflow-y-auto border border-[#E4DDD0] p-2.5 grid grid-cols-2 gap-1.5">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(boxForm.included_category_ids || []).includes(cat.id)}
                      onChange={() => toggleBoxCategory(cat.id)}
                    />
                    <span className="truncate">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Available Sizes (comma-separated)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Customer Style Preferences (comma-separated)
              </label>
              <input
                type="text"
                value={prefsInput}
                onChange={(e) => setPrefsInput(e.target.value)}
                className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={boxForm.is_active ?? true}
                onChange={(e) => setBoxForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              <span>Box Active on Storefront</span>
            </label>

            <button
              type="submit"
              disabled={savingBox}
              className="w-full py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {savingBox ? 'Saving...' : boxForm.id ? 'Update Surprise Box' : 'Create Surprise Box'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#E4DDD0] divide-y divide-[#E4DDD0]">
            {surpriseBoxes.length === 0 ? (
              <p className="p-6 text-xs text-[#5A5853]">No surprise boxes configured yet.</p>
            ) : (
              surpriseBoxes.map((box) => (
                <div key={box.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={box.image_url}
                      alt=""
                      className="w-20 h-16 object-cover bg-[#F5F0E7] border border-[#E4DDD0] shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#B99A61]">
                        {box.tier_label} · {formatPrice(box.price, currencySymbol)} ·{' '}
                        {box.item_count} Pieces
                      </p>
                      <p className="font-serif text-lg font-semibold text-[#242424] truncate">
                        {box.name}
                      </p>
                      <p className="text-xs text-[#5A5853] line-clamp-2">{box.description}</p>
                      <p className="text-[11px] text-[#7A756D] tabular-nums">
                        Stock: {box.available_quantity} · Sizes: {box.available_sizes.join(', ')} ·{' '}
                        {box.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditBox(box)}
                      className="px-2.5 py-1.5 border border-[#D8CFC0] text-[11px] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBox(box.id)}
                      className="p-1.5 text-[#991B1B] border border-[#FECACA]"
                      aria-label={`Delete ${box.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
