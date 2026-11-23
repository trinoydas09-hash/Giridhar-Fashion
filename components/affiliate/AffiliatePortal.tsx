'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type View = 'login' | 'signup' | 'dashboard';
type Dashboard = {
  account: { full_name: string; affiliate_code: string; status: string; whatsapp_number: string };
  links: Array<{ id: string; destination_url: string; link_type: string; slug: string; created_at: string }>;
  clicks: number; commissions: Array<Record<string, unknown>>; payouts: Array<Record<string, unknown>>;
  balance: number; paid: number; minimumPayout: number; whatsappNumber?: string;
};

export function AffiliatePortal({ view }: { view: View }) {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [url, setUrl] = useState('');
  const [linkType, setLinkType] = useState('product');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutWhatsAppUrl, setPayoutWhatsAppUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDashboard = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/affiliate', { headers: { Authorization: 'Bearer ' + accessToken }, cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Unable to load your affiliate account.');
    setData(json);
  }, []);

  useEffect(() => {
    if (view !== 'dashboard' || !supabase) return;
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { window.location.href = '/affiliates/login'; return; }
      setToken(accessToken);
      try { await loadDashboard(accessToken); } catch (err) { setNotice(err instanceof Error ? err.message : 'Unable to load dashboard.'); }
    });
  }, [view, supabase, loadDashboard]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setNotice('Authentication is not configured. Please contact the store admin.'); return; }
    setBusy(true); setNotice('');
    try {
      if (view === 'signup') {
        const { data: result, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, whatsapp_number: phone } } });
        if (error) throw error;
        const accessToken = result.session?.access_token;
        if (!accessToken) { setNotice('Account created. Verify your email, then sign in to finish your affiliate application.'); return; }
        const res = await fetch('/api/affiliate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ full_name: name, whatsapp_number: phone }) });
        const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Could not submit affiliate application.');
        window.location.href = '/affiliates';
      } else {
        const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!result.session?.access_token) throw new Error('Sign in did not return a session.');
        const accessToken = result.session.access_token;
        const check = await fetch('/api/affiliate', { headers: { Authorization: 'Bearer ' + accessToken }, cache: 'no-store' });
        if (check.status === 404) {
          const meta = result.user.user_metadata || {};
          if (meta.full_name && meta.whatsapp_number) {
            const apply = await fetch('/api/affiliate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ full_name: meta.full_name, whatsapp_number: meta.whatsapp_number }) });
            const applied = await apply.json(); if (!apply.ok) throw new Error(applied.error || 'Could not submit affiliate application.');
          } else {
            window.location.href = '/affiliates/signup';
            return;
          }
        }
        window.location.href = '/affiliates';
      }
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const res = await fetch('/api/affiliate/links', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ destination_url: url, link_type: linkType }) });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Could not create link.');
      setUrl(''); await navigator.clipboard.writeText(json.link.referral_url); setNotice('Referral link created and copied.');
      await loadDashboard(token);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Link creation failed.'); }
    finally { setBusy(false); }
  };

  const requestPayout = async () => {
    setBusy(true); setNotice('');
    try {
      const res = await fetch('/api/affiliate/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ amount: Number(payoutAmount) }) });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Payout request failed.');
      const msg = encodeURIComponent('Hello GIRIDHAR FASHION, I have submitted an affiliate payout request. Affiliate ID: ' + data?.account.affiliate_code + '. Amount: ৳' + payoutAmount + '. Please review my payout.');
      const number = data?.whatsappNumber?.replace(/\D/g, '');
      setNotice('Payout request submitted. Contact the store on WhatsApp to coordinate payment.');
      if (number) setPayoutWhatsAppUrl('https://wa.me/' + number + '?text=' + msg);
      await loadDashboard(token);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Payout request failed.'); }
    finally { setBusy(false); }
  };

  if (view !== 'dashboard') return (
    <main className="min-h-[70vh] bg-[#FAF9F6] px-4 py-14">
      <section className="mx-auto max-w-md border border-[#E4DDD0] bg-white p-7 sm:p-9 space-y-6">
        <p className="text-[11px] tracking-[.2em] uppercase text-[#B99A61]">GIRIDHAR FASHION · Affiliate Programme</p>
        <h1 className="font-serif text-3xl text-[#173D32]">{view === 'signup' ? 'Join as an Affiliate' : 'Affiliate Login'}</h1>
        <form onSubmit={submitAuth} className="space-y-4">
          {view === 'signup' && <><label className="block text-xs">Full name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full border p-3" /></label><label className="block text-xs">WhatsApp number<input required value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full border p-3" /></label></>}
          <label className="block text-xs">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border p-3" /></label>
          <label className="block text-xs">Password<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border p-3" /></label>
          <button disabled={busy} className="w-full bg-[#173D32] text-white py-3 text-xs uppercase tracking-wider disabled:opacity-50">{busy ? 'Please wait…' : view === 'signup' ? 'Create Affiliate Account' : 'Sign In'}</button>
        </form>
        {notice && <p role="status" className="text-xs text-[#8A5B20]">{notice}</p>}
        <p className="text-xs text-[#5A5853]">{view === 'signup' ? 'Already registered?' : 'New to the programme?'} <Link className="underline text-[#173D32]" href={view === 'signup' ? '/affiliates/login' : '/affiliates/signup'}>{view === 'signup' ? 'Login' : 'Create an account'}</Link></p>
      </section>
    </main>
  );

  if (!data) return <main className="min-h-[60vh] p-10 text-center text-sm">Loading affiliate dashboard… {notice}</main>;
  const status = data.account.status;
  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[.2em] text-[#B99A61]">Affiliate Programme</p><h1 className="font-serif text-3xl text-[#173D32]">Welcome, {data.account.full_name}</h1><p className="text-xs text-[#666] mt-1">Affiliate ID: {data.account.affiliate_code}</p></div><button onClick={async()=>{await supabase?.auth.signOut();window.location.href='/affiliates/login';}} className="border px-4 py-2 text-xs">Sign out</button></header>
        {status !== 'active' && <div className="border border-[#D6B46A] bg-[#FBF7ED] p-4 text-sm">Your application status: <b className="capitalize">{status}</b>. Link creation and commissions will be enabled after admin approval.</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Clicks',data.clicks],['Approved Balance','৳'+data.balance.toLocaleString('en-BD')],['Paid','৳'+data.paid.toLocaleString('en-BD')],['Orders',data.commissions.length]].map(([label,value])=><div key={String(label)} className="border bg-white p-4"><p className="text-[10px] uppercase text-[#777]">{label}</p><p className="font-serif text-2xl text-[#173D32] mt-2">{value}</p></div>)}
        </div>
        {status === 'active' && <div className="grid md:grid-cols-2 gap-5">
          <form onSubmit={createLink} className="border bg-white p-5 space-y-3"><h2 className="font-serif text-xl">Build Your Affiliate Link</h2><label className="block text-xs">Link type<select value={linkType} onChange={e=>setLinkType(e.target.value)} className="mt-1 w-full border p-3"><option value="product">Product URL</option><option value="category">Category URL</option><option value="page">Page URL</option></select></label><label className="block text-xs">Paste website URL<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://yourwebsite.com/product/..." className="mt-1 w-full border p-3" /></label><button disabled={busy} className="bg-[#173D32] text-white px-5 py-3 text-xs uppercase">Generate & Copy Link</button></form>
          <div className="border bg-white p-5 space-y-3"><h2 className="font-serif text-xl">Request Payout</h2><p className="text-xs text-[#666]">Minimum payout: ৳{data.minimumPayout}</p><input type="number" min={data.minimumPayout} max={data.balance} value={payoutAmount} onChange={e=>setPayoutAmount(e.target.value)} placeholder="Amount in BDT" className="w-full border p-3 text-sm"/><button disabled={busy || Number(payoutAmount)<=0 || Number(payoutAmount)>data.balance} onClick={requestPayout} className="bg-[#173D32] text-white px-5 py-3 text-xs uppercase disabled:opacity-50">Submit & Contact on WhatsApp</button>{payoutWhatsAppUrl && <a href={payoutWhatsAppUrl} target="_blank" rel="noreferrer" className="block text-xs underline text-[#173D32]">Open WhatsApp to contact the store</a>}</div>
        </div>}
        {notice && <p role="status" className="text-xs text-[#8A5B20]">{notice}</p>}
        <section className="border bg-white p-5 space-y-3"><h2 className="font-serif text-xl">Your Referral Links</h2>{data.links.length===0?<p className="text-xs text-[#777]">No links created yet.</p>:data.links.map(link=><div key={link.id} className="border-b py-3 text-xs break-all"><p className="font-semibold">{link.link_type.toUpperCase()}</p><p>/r/{link.slug}</p><p className="text-[#777] mt-1">{link.destination_url}</p></div>)}</section>
        <section className="border bg-white p-5 space-y-3"><h2 className="font-serif text-xl">Commission History</h2>{data.commissions.length===0?<p className="text-xs text-[#777]">No confirmed referrals yet.</p>:data.commissions.map((c:any)=><div key={c.id} className="flex justify-between gap-3 border-b py-2 text-xs"><span>{c.order_reference} · {c.commission_rate}%</span><b>৳{Number(c.commission_amount).toLocaleString('en-BD')} · {c.status}</b></div>)}</section>
        <section className="border bg-white p-5 space-y-3"><h2 className="font-serif text-xl">Payout History</h2>{data.payouts.length===0?<p className="text-xs text-[#777]">No payout requests yet.</p>:data.payouts.map((p:any)=><div key={p.id} className="flex justify-between gap-3 border-b py-2 text-xs"><span>{new Date(p.requested_at).toLocaleDateString()}</span><b>৳{Number(p.amount).toLocaleString('en-BD')} · {p.status}</b></div>)}</section>
      </div>
    </main>
  );
}
