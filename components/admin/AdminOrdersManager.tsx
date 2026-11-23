'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, RefreshCw, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';
import { OrderRecord } from '@/types/store';

type FilterTab = 'pending' | 'accepted' | 'rejected' | 'all';

function money(value: number, symbol: string) {
  return formatPrice(Number(value) || 0, symbol);
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
}

function isAccepted(order: OrderRecord) {
  return ['confirmed', 'dispatched', 'completed'].includes(order.status);
}

export function AdminOrdersManager({
  token,
  currencySymbol,
  onNotice,
}: {
  token: string;
  currencySymbol: string;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const knownPendingIds = useRef<Set<string> | null>(null);

  const loadOrders = useCallback(async (notifyNew = false) => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load orders.');
      const next = (data.orders || []) as OrderRecord[];
      const pending = next.filter((order) => order.status === 'pending_whatsapp');
      if (notifyNew && knownPendingIds.current) {
        const fresh = pending.filter((order) => !knownPendingIds.current?.has(order.id));
        if (fresh.length) {
          onNotice('ok', `New order request received: ${fresh[0].reference_code}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`);
        }
      }
      knownPendingIds.current = new Set(pending.map((order) => order.id));
      setOrders(next);
    } catch (err) {
      if (!knownPendingIds.current) {
        onNotice('err', err instanceof Error ? err.message : 'Unable to load orders.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, onNotice]);

  useEffect(() => {
    void loadOrders(false);
    const timer = window.setInterval(() => void loadOrders(true), 30000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const accepted = orders.filter(isAccepted);
    const sum = (items: OrderRecord[]) => items.reduce((total, order) => total + Number(order.total_amount || 0), 0);
    const today = orders.filter((order) => new Date(order.created_at) >= todayStart);
    const week = orders.filter((order) => new Date(order.created_at) >= weekStart);
    const month = orders.filter((order) => new Date(order.created_at) >= monthStart);
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending_whatsapp').length,
      accepted: accepted.length,
      rejected: orders.filter((order) => order.status === 'rejected').length,
      revenue: sum(accepted),
      todayCount: today.length,
      todayRevenue: sum(today.filter(isAccepted)),
      weekCount: week.length,
      weekRevenue: sum(week.filter(isAccepted)),
      monthCount: month.length,
      monthRevenue: sum(month.filter(isAccepted)),
    };
  }, [orders]);

  const filtered = useMemo(() => orders.filter((order) => {
    if (filter === 'pending') return order.status === 'pending_whatsapp';
    if (filter === 'accepted') return isAccepted(order);
    if (filter === 'rejected') return order.status === 'rejected';
    return true;
  }), [orders, filter]);

  const review = async (order: OrderRecord, action: 'accept' | 'reject') => {
    const verb = action === 'accept' ? 'accept' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} order ${order.reference_code}?`)) return;
    setBusyId(order.id);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Unable to ${verb} order.`);
      onNotice('ok', `Order ${order.reference_code} ${action === 'accept' ? 'accepted; payment marked as received' : 'rejected'}.`);
      await loadOrders(false);
    } catch (err) {
      onNotice('err', err instanceof Error ? err.message : 'Order update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'accepted', label: 'Accepted', count: stats.accepted },
    { id: 'rejected', label: 'Rejected', count: stats.rejected },
    { id: 'all', label: 'All Orders', count: stats.total },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DDD0] pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B99A61]">Order Review & Business Accounts</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">ORDERS & REVENUE</h2>
            <p className="text-xs text-[#5A5853] mt-1">WhatsApp checkout remains unchanged. Review each saved request here after checking the WhatsApp conversation and payment.</p>
          </div>
          <button type="button" onClick={() => void loadOrders(false)} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 border border-[#D8CFC0] text-xs font-semibold uppercase tracking-wider text-[#173D32] disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#5A5853]">All-Time Revenue</p><p className="font-serif text-xl mt-1 text-[#173D32]">{money(stats.revenue, currencySymbol)}</p><p className="text-[10px] text-[#77736B] mt-1">{stats.accepted} accepted orders</p></div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#173D32]">Today's Revenue</p><p className="font-serif text-xl mt-1 text-[#173D32]">{money(stats.todayRevenue, currencySymbol)}</p><p className="text-[10px] text-[#77736B] mt-1">{stats.todayCount} order requests today</p></div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#173D32]">This Week's Revenue</p><p className="font-serif text-xl mt-1 text-[#173D32]">{money(stats.weekRevenue, currencySymbol)}</p><p className="text-[10px] text-[#77736B] mt-1">{stats.weekCount} order requests this week</p></div>
          <div className="bg-[#FAF9F6] border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#173D32]">This Month's Revenue</p><p className="font-serif text-xl mt-1 text-[#173D32]">{money(stats.monthRevenue, currencySymbol)}</p><p className="text-[10px] text-[#77736B] mt-1">{stats.monthCount} order requests this month</p></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#5A5853]">Total Requests</p><p className="font-serif text-2xl mt-1">{stats.total}</p></div>
          <div className="border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#9A6B1E]">Pending Review</p><p className="font-serif text-2xl mt-1 text-[#9A6B1E]">{stats.pending}</p></div>
          <div className="border border-[#E4DDD0] p-4"><p className="text-[10px] uppercase tracking-wider text-[#5A5853]">Rejected Orders</p><p className="font-serif text-2xl mt-1">{stats.rejected}</p></div>
        </div>
      </div>

      <div className="bg-white border border-[#E4DDD0] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setFilter(tab.id)} className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border ${filter === tab.id ? 'bg-[#173D32] text-white border-[#173D32]' : 'border-[#D8CFC0] text-[#5A5853]'}`}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-[#5A5853] py-8 text-center">Loading orders…</p> : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#D8CFC0]"><Clock className="w-6 h-6 mx-auto text-[#B99A61] mb-2" /><p className="text-sm text-[#5A5853]">No orders in this section yet.</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <article key={order.id} className="border border-[#E4DDD0] p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold text-[#242424]">{order.reference_code} · {order.customer_name}</p><p className="text-xs text-[#5A5853] mt-1">{shortDate(order.created_at)} · {order.customer_phone}</p>{order.affiliate_code && <p className="text-[11px] text-[#173D32] mt-1">Affiliate referral: {order.affiliate_code}</p>}</div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 border ${order.status === 'pending_whatsapp' ? 'border-[#D6B46A] text-[#946A22] bg-[#FBF7ED]' : order.status === 'rejected' ? 'border-red-200 text-red-700 bg-red-50' : 'border-[#B8C9C0] text-[#173D32] bg-[#F2F7F3]'}`}>
                    {order.status === 'pending_whatsapp' ? 'Pending' : order.status === 'rejected' ? 'Rejected' : order.status === 'confirmed' ? 'Accepted' : order.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5A5853]">
                  <div><p className="font-semibold text-[#242424] mb-1">Delivery Address</p><p>{order.delivery_address}</p>{order.notes && <p className="mt-1">Note: {order.notes}</p>}</div>
                  <div><p className="font-semibold text-[#242424] mb-1">Order Summary</p>{order.items.map((item, idx) => <p key={idx}>{item.quantity}× {item.product_name} · {item.colour} · {item.size} — {money(item.subtotal, currencySymbol)}</p>)}{order.membership_code && <p className="mt-1">VIP {order.membership_code} · −{money(order.membership_discount || 0, currencySymbol)}</p>}<p className="font-semibold text-[#173D32] mt-2">Total: {money(order.total_amount, currencySymbol)}</p></div>
                </div>
                {order.status === 'pending_whatsapp' ? (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E4DDD0]">
                    <button type="button" disabled={busyId === order.id} onClick={() => void review(order, 'accept')} className="inline-flex items-center gap-2 px-4 py-2 bg-[#173D32] text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Accept & Confirm Payment</button>
                    <button type="button" disabled={busyId === order.id} onClick={() => void review(order, 'reject')} className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                    <a href={`https://wa.me/${sanitizeWhatsAppNumber(order.customer_phone)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-[#D8CFC0] text-xs font-semibold text-[#173D32]">Open WhatsApp</a>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#77736B] border-t border-[#E4DDD0] pt-2">Reviewed {order.reviewed_at ? shortDate(order.reviewed_at) : ''} · {order.payment_status === 'paid' ? 'Payment marked received' : order.payment_status || 'Payment unverified'}{order.reviewed_by ? ` · ${order.reviewed_by}` : ''}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#77736B]">Order list refreshes automatically every 30 seconds while this page is open. Accepted order totals are counted as revenue; rejected and pending requests are excluded.</p>
    </div>
  );
}
