'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Clock,
  Copy,
  MessageCircle,
  Power,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';
import { MembershipRequestView } from '@/types/store';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminMembershipRequestsManager({
  currencySymbol,
  brandName,
  token,
  onNotice,
}: {
  currencySymbol: string;
  brandName: string;
  token: string;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [requests, setRequests] = useState<MembershipRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Optional inline customer name / WhatsApp capture before approving
  const [editMap, setEditMap] = useState<
    Record<string, { customerName: string; whatsappNumber: string }>
  >({});

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/admin/membership-requests', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load VIP membership requests.');
    }
    return (data.requests || []) as MembershipRequestView[];
  }, [token]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchRequests();
      setRequests(items);
    } catch (err) {
      onNotice(
        'err',
        err instanceof Error ? err.message : 'Network error loading VIP membership requests.'
      );
    } finally {
      setLoading(false);
    }
  }, [fetchRequests, onNotice]);

  useEffect(() => {
    let active = true;
    fetchRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch((err) => {
        if (active) {
          onNotice(
            'err',
            err instanceof Error ? err.message : 'Network error loading VIP membership requests.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchRequests, onNotice]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.request_status === 'pending').length,
      approved: requests.filter((r) => r.request_status === 'approved').length,
      rejected: requests.filter((r) => r.request_status === 'rejected').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (filterTab === 'all') return requests;
    return requests.filter((r) => r.request_status === filterTab);
  }, [requests, filterTab]);

  const handleAction = async (
    reqItem: MembershipRequestView,
    action: 'approve' | 'reject' | 'activate' | 'deactivate'
  ) => {
    setBusyId(reqItem.id);
    const edits = editMap[reqItem.id];
    try {
      const res = await fetch('/api/admin/membership-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: reqItem.id,
          action,
          customerName: edits?.customerName ?? reqItem.customer_name ?? undefined,
          whatsappNumber: edits?.whatsappNumber ?? reqItem.whatsapp_number ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || `Unable to ${action} membership request.`);
        return;
      }

      const actionLabel =
        action === 'approve'
          ? 'approved and activated (valid for 1 year)'
          : action === 'reject'
          ? 'rejected'
          : action === 'activate'
          ? 'activated'
          : 'deactivated';

      onNotice('ok', `Membership ${reqItem.request_code} ${actionLabel}.`);
      await loadRequests();
    } catch {
      onNotice('err', 'Network error updating membership status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Strip */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DDD0] pb-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B99A61] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Private Concierge Verification</span>
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">
              VIP MEMBERSHIP REQUESTS
            </h2>
            <p className="text-xs text-[#5A5853] max-w-2xl">
              Review customer WhatsApp membership requests, confirm ৳59/year payments, approve &
              activate unique VIP Membership Codes (valid 1 year), or deactivate members.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D8CFC0] text-xs font-semibold uppercase tracking-wider text-[#173D32] hover:border-[#173D32] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5853]">
              Total Requests
            </p>
            <p className="font-serif text-2xl font-semibold text-[#242424] mt-1 tabular-nums">
              {counts.all}
            </p>
          </div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B1E]">
              Pending Verification
            </p>
            <p className="font-serif text-2xl font-semibold text-[#9A6B1E] mt-1 tabular-nums">
              {counts.pending}
            </p>
          </div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#173D32]">
              Approved Members
            </p>
            <p className="font-serif text-2xl font-semibold text-[#173D32] mt-1 tabular-nums">
              {counts.approved}
            </p>
          </div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#991B1B]">
              Rejected
            </p>
            <p className="font-serif text-2xl font-semibold text-[#991B1B] mt-1 tabular-nums">
              {counts.rejected}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'approved', label: `Approved Members (${counts.approved})` },
              { id: 'rejected', label: `Rejected (${counts.rejected})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterTab === tab.id
                  ? 'bg-[#173D32] text-[#FAF9F6]'
                  : 'border border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-[#E4DDD0] overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5A5853]">
            Loading VIP membership requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="w-7 h-7 text-[#B99A61] mx-auto" />
            <p className="font-serif text-xl font-semibold text-[#242424]">
              No membership requests in this view
            </p>
            <p className="text-xs text-[#5A5853]">
              When customers click &ldquo;Join VIP Membership&rdquo; on /membership, their unique
              request codes appear here as Pending until you confirm payment and approve them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F0E7] border-b border-[#E4DDD0] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A5853]">
                  <th className="py-3.5 px-4">Request / Member Code</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Fee & Benefit</th>
                  <th className="py-3.5 px-4">Request Date</th>
                  <th className="py-3.5 px-4">Status & Validity</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DDD0] text-xs">
                {filteredRequests.map((req) => {
                  const busy = busyId === req.id;
                  const draft = editMap[req.id] || {
                    customerName: req.customer_name || '',
                    whatsappNumber: req.whatsapp_number || '',
                  };
                  const activeCode = req.membership_code || req.request_code;
                  const waDigits = sanitizeWhatsAppNumber(
                    draft.whatsappNumber || req.whatsapp_number || ''
                  );
                  const notifyMsg = `Hello${
                    draft.customerName || req.customer_name
                      ? ` ${draft.customerName || req.customer_name}`
                      : ''
                  }! Your ${brandName} VIP Membership is now ACTIVE.\n\nVIP Membership Code: ${activeCode}\nBenefit: ${
                    req.discount_percentage
                  }% OFF all products\nValid Until: ${formatShortDate(
                    req.expires_at
                  )}\n\nEnter this code at checkout on our website to apply your 20% privilege.`;
                  const waNotifyHref = waDigits
                    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(notifyMsg)}`
                    : '';

                  return (
                    <tr key={req.id} className="hover:bg-[#FAF9F6] align-top">
                      <td className="py-4 px-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#173D32]">
                            {activeCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(req.id, activeCode)}
                            title="Copy Membership Code"
                            className="p-1 text-[#5A5853] hover:text-[#173D32]"
                          >
                            {copiedId === req.id ? (
                              <Check className="w-3.5 h-3.5 text-[#173D32]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] font-mono text-[#7A756D]">ID: {req.id}</p>
                      </td>

                      <td className="py-4 px-4 space-y-1.5 min-w-[200px]">
                        <input
                          type="text"
                          value={draft.customerName}
                          onChange={(e) =>
                            setEditMap((prev) => ({
                              ...prev,
                              [req.id]: { ...draft, customerName: e.target.value },
                            }))
                          }
                          placeholder="Customer name (optional)"
                          className="w-full border border-[#E4DDD0] bg-white px-2.5 py-1.5 text-xs text-[#242424] focus:outline-none focus:border-[#173D32]"
                        />
                        <input
                          type="text"
                          value={draft.whatsappNumber}
                          onChange={(e) =>
                            setEditMap((prev) => ({
                              ...prev,
                              [req.id]: { ...draft, whatsappNumber: e.target.value },
                            }))
                          }
                          placeholder="WhatsApp number (optional)"
                          className="w-full border border-[#E4DDD0] bg-white px-2.5 py-1.5 text-xs font-mono text-[#242424] focus:outline-none focus:border-[#173D32]"
                        />
                      </td>

                      <td className="py-4 px-4 tabular-nums">
                        <p className="font-semibold text-[#242424]">
                          {formatPrice(req.membership_fee, currencySymbol)}/year
                        </p>
                        <p className="text-[#5A5853] mt-0.5">{req.discount_percentage}% OFF</p>
                      </td>

                      <td className="py-4 px-4 tabular-nums text-[#5A5853]">
                        <p>{formatShortDate(req.created_at)}</p>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        {req.request_status === 'pending' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#9A6B1E]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                        {req.request_status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#991B1B]">
                            <X className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {req.request_status === 'approved' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#173D32]">
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                Approved ·{' '}
                                {req.membership_status === 'active'
                                  ? 'Active'
                                  : req.membership_status === 'expired'
                                  ? 'Expired'
                                  : 'Inactive'}
                              </span>
                            </span>
                            {req.activated_at && (
                              <p className="text-[11px] text-[#5A5853] tabular-nums">
                                Start: {formatShortDate(req.activated_at)}
                              </p>
                            )}
                            {req.expires_at && (
                              <p className="text-[11px] text-[#5A5853] tabular-nums">
                                Expires: {formatShortDate(req.expires_at)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          {req.request_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleAction(req, 'approve')}
                                className="px-3 py-1.5 bg-[#173D32] text-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-50"
                              >
                                Approve & Activate
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleAction(req, 'reject')}
                                className="px-3 py-1.5 border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#FEE2E2] disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {req.request_status === 'rejected' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleAction(req, 'approve')}
                              className="px-3 py-1.5 border border-[#173D32] text-[#173D32] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#F5F0E7] disabled:opacity-50"
                            >
                              Approve & Activate
                            </button>
                          )}

                          {req.request_status === 'approved' && (
                            <>
                              {req.membership_status === 'active' ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleAction(req, 'deactivate')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#D8CFC0] text-[#991B1B] text-[11px] font-semibold uppercase tracking-wider hover:border-[#991B1B] disabled:opacity-50"
                                >
                                  <Power className="w-3 h-3" />
                                  <span>Deactivate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleAction(req, 'activate')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#173D32] text-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-50"
                                >
                                  <Power className="w-3 h-3" />
                                  <span>Activate</span>
                                </button>
                              )}

                              {waNotifyHref && (
                                <a
                                  href={waNotifyHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#F5F0E7]"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>Send Code</span>
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
