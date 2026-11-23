'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  MessageCircle,
  Search,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';
import { MembershipConfig, StoreSettings } from '@/types/store';

interface CreatedMembershipRequestState {
  requestCode: string;
  requestStatus: string;
  whatsappMessage: string;
  whatsappUrl: string;
}

interface StatusLookupResult {
  valid: boolean;
  status: 'active' | 'pending' | 'rejected' | 'inactive' | 'expired' | 'invalid';
  code: string;
  discountPercentage: number;
  activatedAt: string | null;
  expiresAt: string | null;
  error?: string;
}

export function MembershipClient({
  membership,
  settings,
}: {
  membership: MembershipConfig;
  settings: StoreSettings;
}) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(membership.faqs[0]?.id || null);

  // Optional customer details before generating pending request code
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<CreatedMembershipRequestState | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Self-service code status verification (non-PII)
  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<StatusLookupResult | null>(null);

  const sanitizedWa = useMemo(
    () => sanitizeWhatsAppNumber(settings.whatsapp_number),
    [settings.whatsapp_number]
  );

  const previewTemplateText = useMemo(() => {
    const sampleCode = createdRequest?.requestCode || 'GF-XXXXXX';
    const raw = (membership.whatsapp_message_template || '').trim();
    if (raw.includes('{{REQUEST_CODE}}')) {
      return raw.replace(/\{\{REQUEST_CODE\}\}/g, sampleCode);
    }
    return [
      `Hello ${settings.brand_name}!`,
      '',
      'I want to purchase the VIP Membership.',
      '',
      `Membership Fee: ${settings.currency_symbol}${membership.price_bdt}/${membership.billing_period_label}`,
      `Membership Benefit: ${membership.discount_percentage}% OFF`,
      `Membership Request Code: ${sampleCode}`,
      '',
      'Please provide the payment details and activate my membership.',
    ].join('\n');
  }, [
    createdRequest?.requestCode,
    membership.billing_period_label,
    membership.discount_percentage,
    membership.price_bdt,
    membership.whatsapp_message_template,
    settings.brand_name,
    settings.currency_symbol,
  ]);

  const openWhatsAppTab = (url: string) => {
    if (!url || typeof document === 'undefined') return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleJoinMembership = async () => {
    if (submittingRequest) return;
    setRequestError(null);
    setSubmittingRequest(true);

    try {
      const res = await fetch('/api/store/membership-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim() || undefined,
          whatsapp_number: customerPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error || 'Could not generate your membership request code.');
        return;
      }

      const nextState: CreatedMembershipRequestState = {
        requestCode: data.requestCode,
        requestStatus: data.requestStatus || 'pending',
        whatsappMessage: data.whatsappMessage,
        whatsappUrl: data.whatsappUrl,
      };
      setCreatedRequest(nextState);
      setLookupCode(data.requestCode);

      if (data.whatsappUrl) {
        openWhatsAppTab(data.whatsappUrl);
      }
    } catch {
      setRequestError('Network error while creating your membership request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleCheckCodeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupCode.trim().toUpperCase();
    if (!cleaned) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/store/membership-requests?code=${encodeURIComponent(cleaned)}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as StatusLookupResult;
      setLookupResult(data);
    } catch {
      setLookupResult({
        valid: false,
        status: 'invalid',
        code: cleaned,
        discountPercentage: 0,
        activatedAt: null,
        expiresAt: null,
        error: 'Unable to check status right now. Please try again.',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  if (!membership.is_active) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61] mb-3">
          {settings.brand_name}
        </p>
        <h1 className="font-serif text-4xl font-semibold text-[#242424] text-balance">
          Membership Enrollment Currently Paused
        </h1>
        <p className="mt-4 text-sm text-[#5A5853] max-w-lg mx-auto leading-relaxed">
          Our membership enrollment window is being updated. Explore our current menswear collection
          and active promotional offers in the meantime.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/shop"
            className="px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Browse Collection
          </Link>
          <Link
            href="/offers"
            className="px-6 py-3 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase tracking-[0.14em]"
          >
            View Offers
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero & Membership Card Split */}
      <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#B99A61]">
                  {membership.tagline}
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#FAF9F6] mt-3 leading-[1.08] text-balance">
                  {membership.name}
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[#F5F0E7]/85 max-w-2xl leading-relaxed">
                  {membership.hero_description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#F5F0E7]/15">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#B99A61]">
                    Membership Fee
                  </p>
                  <p className="font-serif text-3xl font-semibold text-[#FAF9F6] mt-1 tabular-nums">
                    {formatPrice(membership.price_bdt, settings.currency_symbol)}
                    <span className="text-sm font-sans font-normal text-[#F5F0E7]/75">
                      /{membership.billing_period_label}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#B99A61]">
                    Confirmed Member Privilege
                  </p>
                  <p className="font-serif text-3xl font-semibold text-[#FAF9F6] mt-1 tabular-nums">
                    {membership.discount_percentage}% OFF
                  </p>
                  <p className="text-xs text-[#F5F0E7]/75 mt-0.5">On all collection pieces</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#B99A61]">
                    Validity Period
                  </p>
                  <p className="text-sm font-medium text-[#FAF9F6] mt-2 leading-snug">
                    {membership.validity_text}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrollment Action Card */}
            <div className="lg:col-span-5 bg-[#FAF9F6] text-[#242424] border border-[#E4DDD0] rounded-sm shadow-lg p-7 sm:p-9 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4DDD0] pb-4">
                  <div>
                    <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B99A61]">
                      Annual Concierge Pass
                    </p>
                    <h2 className="font-serif text-2xl font-semibold text-[#173D32] mt-1">
                      Request VIP Registration
                    </h2>
                  </div>
                  <Award className="w-7 h-7 text-[#B99A61] shrink-0" />
                </div>

                {membership.promo_banner_text && (
                  <p className="text-xs font-medium text-[#173D32] bg-[#F5F0E7] border border-[#E4DDD0] px-3.5 py-2.5 leading-relaxed">
                    {membership.promo_banner_text}
                  </p>
                )}

                <ul className="space-y-2 text-sm text-[#242424] pt-1">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
                    <span>
                      Flat <strong className="tabular-nums">{membership.discount_percentage}% OFF</strong>{' '}
                      across all products with your unique VIP Membership Code
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
                    <span>
                      Annual fee of{' '}
                      <strong className="tabular-nums">
                        {formatPrice(membership.price_bdt, settings.currency_symbol)}/
                        {membership.billing_period_label}
                      </strong>{' '}
                      confirmed manually on WhatsApp
                    </span>
                  </li>
                </ul>

                {!createdRequest ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label htmlFor="vip-req-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5853] mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        id="vip-req-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Tanvir Hasan"
                        className="w-full border border-[#D8CFC0] bg-white px-3 py-2 text-xs text-[#242424] focus:outline-none focus:border-[#173D32]"
                      />
                    </div>
                    <div>
                      <label htmlFor="vip-req-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5853] mb-1">
                        WhatsApp No. (Optional)
                      </label>
                      <input
                        id="vip-req-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 017XXXXXXXX"
                        className="w-full border border-[#D8CFC0] bg-white px-3 py-2 text-xs text-[#242424] focus:outline-none focus:border-[#173D32]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#173D32] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B99A61]">
                        Request Recorded · Pending Activation
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(createdRequest.requestCode)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#173D32] hover:underline"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-2xl font-bold tracking-[0.12em] text-[#173D32]">
                      {createdRequest.requestCode}
                    </p>
                    <p className="text-xs text-[#5A5853] leading-relaxed">
                      Send the pre-filled message in WhatsApp. Once our team confirms your{' '}
                      {formatPrice(membership.price_bdt, settings.currency_symbol)} payment, this
                      code becomes active for 1 year.
                    </p>
                  </div>
                )}

                {requestError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-[#E4DDD0] space-y-3">
                {sanitizedWa ? (
                  createdRequest?.whatsappUrl ? (
                    <div className="space-y-2.5">
                      <a
                        href={createdRequest.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#102B23] transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Open WhatsApp & Send Request</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setCreatedRequest(null)}
                        className="w-full text-[11px] text-[#5A5853] hover:text-[#242424] underline underline-offset-4"
                      >
                        Generate a new request
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleJoinMembership}
                      disabled={submittingRequest}
                      className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#102B23] transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap disabled:opacity-60"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {submittingRequest
                          ? 'Generating Request Code...'
                          : membership.cta_button_label || 'Join VIP Membership'}
                      </span>
                    </button>
                  )
                ) : (
                  <p className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] p-3">
                    {settings.store_email
                      ? `Store WhatsApp number is being updated. Contact ${settings.store_email} for membership inquiries.`
                      : 'Membership registration will reopen once the official store WhatsApp contact is configured.'}
                  </p>
                )}

                <div className="flex items-start gap-2 text-xs text-[#5A5853] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
                  <span>
                    Clicking above generates your unique Membership Request Code and opens WhatsApp.
                    Please send the message manually; membership activates only after{' '}
                    {settings.brand_name} confirms your payment.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Status Lookup */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border border-[#E4DDD0] rounded-sm shadow-xs p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B99A61]">
              Already Requested Membership?
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#242424]">
              Check Your Membership Code Status
            </h2>
            <p className="text-xs text-[#5A5853]">
              Enter your unique <span className="font-mono">GF-XXXXXX</span> code to verify
              activation and one-year validity before heading to checkout.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[420px] space-y-2.5">
            <form onSubmit={handleCheckCodeStatus} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder="Enter your Membership Code (e.g. GF-XXXXXX)"
                className="flex-1 min-w-0 border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm font-mono uppercase text-[#242424] focus:outline-none focus:border-[#173D32]"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-5 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#102B23] inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{lookupLoading ? 'Checking...' : 'Check Status'}</span>
              </button>
            </form>

            {lookupResult && (
              <div
                className={`p-3 border text-xs leading-relaxed ${
                  lookupResult.valid
                    ? 'bg-[#F5F0E7] border-[#173D32] text-[#173D32]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                }`}
              >
                {lookupResult.valid ? (
                  <p>
                    <strong>{lookupResult.code} is Active</strong> — {lookupResult.discountPercentage}%
                    OFF eligible products
                    {lookupResult.expiresAt
                      ? ` · Valid until ${new Date(lookupResult.expiresAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''}
                    . Apply this code at checkout.
                  </p>
                ) : (
                  <p>{lookupResult.error || 'This code is not currently active.'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-2">
            Confirmed Privileges
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] text-balance">
            What Your Membership Includes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {membership.benefits.map((benefit, index) => (
            <div
              key={benefit.id}
              className="bg-white border border-[#E4DDD0] rounded-sm shadow-xs p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#B99A61] tabular-nums">
                    0{index + 1}.
                  </span>
                  <Tag className="w-4 h-4 text-[#173D32]" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#242424]">
                  {benefit.title}
                </h3>
                <p className="mt-2.5 text-sm text-[#5A5853] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Membership Works */}
      <section className="bg-[#F5F0E7] border-y border-[#E4DDD0] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#173D32] mb-2">
              Enrollment Process
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] text-balance">
              How Membership Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {membership.how_it_works
              .slice()
              .sort((a, b) => a.step_number - b.step_number)
              .map((step) => (
                <div key={step.id} className="bg-[#FAF9F6] border border-[#E4DDD0] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B99A61] mb-3 tabular-nums">
                    Step 0{step.step_number}
                  </p>
                  <h3 className="font-serif text-xl font-semibold text-[#242424]">{step.title}</h3>
                  <p className="mt-2.5 text-sm text-[#5A5853] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
          </div>

          {/* Pre-filled Message Preview */}
          <div className="mt-10 bg-white border border-[#E4DDD0] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5A5853]">
                WhatsApp Registration Inquiry Preview
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-[#242424] bg-[#FAF9F6] border border-[#E4DDD0] p-4 leading-relaxed">
                {previewTemplateText}
              </pre>
            </div>

            {sanitizedWa && (
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleJoinMembership}
                  disabled={submittingRequest}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#102B23] transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <span>{membership.cta_button_label || 'Join VIP Membership'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-2">
            Membership Guide
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#242424] text-balance">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#E4DDD0] border border-[#E4DDD0] rounded-sm shadow-xs bg-white">
          {membership.faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className="px-6 py-5">
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-lg font-medium text-[#242424]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#173D32] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm text-[#5A5853] leading-relaxed pr-6">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
