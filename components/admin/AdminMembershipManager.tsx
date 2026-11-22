'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { MembershipConfig } from '@/types/store';
import { AdminMembershipRequestsManager } from './AdminMembershipRequestsManager';

export function AdminMembershipManager({
  membership,
  currencySymbol,
  brandName,
  token,
  onRefresh,
  onNotice,
}: {
  membership: MembershipConfig;
  currencySymbol: string;
  brandName: string;
  token: string;
  onRefresh: () => Promise<void>;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [subTab, setSubTab] = useState<'requests' | 'settings'>('requests');
  const [draft, setDraft] = useState<MembershipConfig>(membership);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...draft,
          price_bdt: Number(draft.price_bdt) || 0,
          discount_percentage: Number(draft.discount_percentage) || 0,
          benefits: draft.benefits.filter((b) => b.title.trim() && b.description.trim()),
          how_it_works: draft.how_it_works
            .filter((s) => s.title.trim() && s.description.trim())
            .map((s, idx) => ({ ...s, step_number: idx + 1 })),
          faqs: draft.faqs.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Could not save membership settings.');
        return;
      }
      setDraft(data.membership);
      onNotice('ok', 'Premium Membership configuration saved and published.');
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving membership configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E4DDD0] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              subTab === 'requests'
                ? 'bg-[#173D32] text-[#FAF9F6]'
                : 'border border-[#D8CFC0] text-[#242424] hover:border-[#173D32]'
            }`}
          >
            VIP Membership Requests
          </button>
          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              subTab === 'settings'
                ? 'bg-[#173D32] text-[#FAF9F6]'
                : 'border border-[#D8CFC0] text-[#242424] hover:border-[#173D32]'
            }`}
          >
            Program Pricing & Settings
          </button>
        </div>

        <Link
          href="/membership"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D8CFC0] text-xs font-semibold text-[#173D32]"
        >
          <span>View /membership</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {subTab === 'requests' ? (
        <AdminMembershipRequestsManager
          currencySymbol={currencySymbol}
          brandName={brandName}
          token={token}
          onNotice={onNotice}
        />
      ) : (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
          <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DDD0] pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              Premium Membership Settings
            </h2>
            <p className="text-xs text-[#5A5853] mt-0.5">
              Customize pricing, confirmed discount benefits, validity, FAQs, and the automated
              WhatsApp enrollment message.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/membership"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D8CFC0] text-xs font-semibold text-[#173D32]"
            >
              <span>View /membership</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5F0E7] border border-[#E4DDD0] text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              <span>{draft.is_active ? 'Program Active' : 'Paused'}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Membership Name *</label>
            <input
              type="text"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Tagline *</label>
            <input
              type="text"
              required
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">
              Membership Fee ({currencySymbol}) *
            </label>
            <input
              type="number"
              min={0}
              required
              value={draft.price_bdt}
              onChange={(e) => setDraft({ ...draft, price_bdt: Number(e.target.value) || 0 })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Billing Period *</label>
            <input
              type="text"
              required
              value={draft.billing_period_label}
              onChange={(e) => setDraft({ ...draft, billing_period_label: e.target.value })}
              placeholder="year"
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">
              Product Discount (%) *
            </label>
            <input
              type="number"
              min={0}
              max={90}
              required
              value={draft.discount_percentage}
              onChange={(e) =>
                setDraft({ ...draft, discount_percentage: Number(e.target.value) || 0 })
              }
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">CTA Button Label *</label>
            <input
              type="text"
              required
              value={draft.cta_button_label}
              onChange={(e) => setDraft({ ...draft, cta_button_label: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Validity Text *</label>
            <input
              type="text"
              required
              value={draft.validity_text}
              onChange={(e) => setDraft({ ...draft, validity_text: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">
              Promotional Callout Text
            </label>
            <input
              type="text"
              value={draft.promo_banner_text}
              onChange={(e) => setDraft({ ...draft, promo_banner_text: e.target.value })}
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase mb-1">Hero Introduction *</label>
          <textarea
            rows={2}
            required
            value={draft.hero_description}
            onChange={(e) => setDraft({ ...draft, hero_description: e.target.value })}
            className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase mb-1">
            Pre-filled WhatsApp Inquiry Message *
          </label>
          <textarea
            rows={4}
            required
            value={draft.whatsapp_message_template}
            onChange={(e) => setDraft({ ...draft, whatsapp_message_template: e.target.value })}
            className="w-full border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
          />
          <p className="text-[11px] text-[#7A756D] mt-1">
            Customers send this manually to your official WhatsApp number; membership is never
            auto-activated before confirmation.
          </p>
        </div>
      </div>

      {/* Benefits Editor */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-[#242424]">Member Benefits</h3>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                benefits: [
                  ...draft.benefits,
                  { id: `ben-${Date.now()}`, title: '', description: '' },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Benefit</span>
          </button>
        </div>

        <div className="space-y-3">
          {draft.benefits.map((b, idx) => (
            <div key={b.id} className="p-4 bg-[#FAF9F6] border border-[#E4DDD0] space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      benefits: draft.benefits.map((item, i) =>
                        i === idx ? { ...item, title: e.target.value } : item
                      ),
                    })
                  }
                  placeholder="Benefit Title (e.g. 20% Discount on All Products)"
                  className="flex-1 bg-white border border-[#D8CFC0] px-3 py-1.5 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      benefits: draft.benefits.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-1.5 text-[#991B1B] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={b.description}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    benefits: draft.benefits.map((item, i) =>
                      i === idx ? { ...item, description: e.target.value } : item
                    ),
                  })
                }
                placeholder="Clear description of this benefit..."
                className="w-full bg-white border border-[#D8CFC0] px-3 py-1.5 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Editor */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-[#242424]">How Membership Works</h3>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                how_it_works: [
                  ...draft.how_it_works,
                  {
                    id: `step-${Date.now()}`,
                    step_number: draft.how_it_works.length + 1,
                    title: '',
                    description: '',
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>
        </div>

        <div className="space-y-3">
          {draft.how_it_works.map((step, idx) => (
            <div key={step.id} className="p-4 bg-[#FAF9F6] border border-[#E4DDD0] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#B99A61] px-2">0{idx + 1}.</span>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      how_it_works: draft.how_it_works.map((item, i) =>
                        i === idx ? { ...item, title: e.target.value } : item
                      ),
                    })
                  }
                  placeholder="Step Title"
                  className="flex-1 bg-white border border-[#D8CFC0] px-3 py-1.5 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      how_it_works: draft.how_it_works.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-1.5 text-[#991B1B] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={step.description}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    how_it_works: draft.how_it_works.map((item, i) =>
                      i === idx ? { ...item, description: e.target.value } : item
                    ),
                  })
                }
                placeholder="Step instructions..."
                className="w-full bg-white border border-[#D8CFC0] px-3 py-1.5 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Membership FAQs Editor */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-[#242424]">Membership FAQs</h3>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                faqs: [...draft.faqs, { id: `mfaq-${Date.now()}`, question: '', answer: '' }],
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add FAQ</span>
          </button>
        </div>

        <div className="space-y-3">
          {draft.faqs.map((faq, idx) => (
            <div key={faq.id} className="p-4 bg-[#FAF9F6] border border-[#E4DDD0] space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faqs: draft.faqs.map((item, i) =>
                        i === idx ? { ...item, question: e.target.value } : item
                      ),
                    })
                  }
                  placeholder="Membership question..."
                  className="flex-1 bg-white border border-[#D8CFC0] px-3 py-1.5 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      faqs: draft.faqs.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-1.5 text-[#991B1B] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={faq.answer}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    faqs: draft.faqs.map((item, i) =>
                      i === idx ? { ...item, answer: e.target.value } : item
                    ),
                  })
                }
                placeholder="Answer..."
                className="w-full bg-white border border-[#D8CFC0] px-3 py-1.5 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-8 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
      >
          {saving ? 'Saving Membership...' : 'Save Membership Settings'}
        </button>
      </form>
      )}
    </div>
  );
}
