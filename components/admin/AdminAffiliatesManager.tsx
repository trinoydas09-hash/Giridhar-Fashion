'use client';

import React, { useCallback, useEffect, useState } from 'react';

type Props = { token: string; onNotice: (type: 'ok'|'err', text: string) => void };
export function AdminAffiliatesManager({ token, onNotice }: Props) {
  const [data, setData] = useState<any>(null);
  const [rate, setRate] = useState('10');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/affiliates', { headers: { Authorization: 'Bearer '+token }, cache: 'no-store' });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Unable to load affiliates.');
      setData(json); setRate(String(json.settings?.global_commission_rate ?? 10));
    } catch (e) { onNotice('err', e instanceof Error ? e.message : 'Unable to load affiliates.'); }
  }, [token, onNotice]);
  useEffect(() => { void load(); }, [load]);
  const action = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/affiliates', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}, body:JSON.stringify(body) });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Action failed.');
      onNotice('ok', success); await load();
    } catch(e) { onNotice('err', e instanceof Error ? e.message : 'Action failed.'); }
    finally { setBusy(false); }
  };
  if (!data) return <div className="border bg-white p-8 text-sm">Loading affiliate accounts…</div>;
  const clickCount = (id:string) => data.clicks.filter((x:any)=>x.affiliate_user_id===id).length;
  const commissionSum = (id:string,status?:string) => data.commissions.filter((x:any)=>x.affiliate_user_id===id && (!status || x.status===status)).reduce((n:number,x:any)=>n+Number(x.commission_amount),0);
  return <div className="space-y-6">
    <section className="border bg-white p-5 space-y-4">
      <div><p className="text-[10px] uppercase tracking-[.18em] text-[#B99A61]">Affiliate Programme Settings</p><h2 className="font-serif text-2xl">Global Commission Rate</h2><p className="text-xs text-[#666]">One rate applies to all active affiliates. Existing commission records keep their saved rate.</p></div>
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs">Commission percentage<input type="number" min="0" max="100" step="0.5" value={rate} onChange={e=>setRate(e.target.value)} className="block mt-1 border p-3 w-36"/></label><button disabled={busy} onClick={()=>void action({action:'global_rate',rate:Number(rate)},'Global commission rate updated.')} className="bg-[#173D32] text-white px-5 py-3 text-xs uppercase disabled:opacity-50">Save Global Rate</button><span className="text-xs text-[#777]">Current: {data.settings?.global_commission_rate ?? 10}%</span></div>
    </section>
    <section className="border bg-white p-5 space-y-4"><div><h2 className="font-serif text-2xl">Affiliate Accounts</h2><p className="text-xs text-[#666]">{data.accounts.length} registered accounts</p></div>
      {data.accounts.length===0?<p className="text-sm text-[#777]">No affiliate applications yet.</p>:data.accounts.map((a:any)=><article key={a.user_id} className="border p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-sm">{a.full_name}</p><p className="text-xs text-[#666]">{a.email} · {a.whatsapp_number}</p><p className="text-[11px] text-[#777] mt-1">ID: {a.affiliate_code} · {clickCount(a.user_id)} clicks</p></div><span className="text-xs uppercase font-semibold">{a.status}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs"><p>Approved: ৳{commissionSum(a.user_id,'approved').toLocaleString('en-BD')}</p><p>Paid: ৳{commissionSum(a.user_id,'paid').toLocaleString('en-BD')}</p><p>Links: {data.links.filter((x:any)=>x.affiliate_user_id===a.user_id).length}</p></div>
        <div className="flex flex-wrap gap-2">{a.status!=='active'&&<button disabled={busy} onClick={()=>void action({action:'account_status',userId:a.user_id,status:'active'},'Affiliate approved.')} className="bg-[#173D32] text-white px-3 py-2 text-[10px] uppercase">Approve</button>}{a.status!=='suspended'&&<button disabled={busy} onClick={()=>void action({action:'account_status',userId:a.user_id,status:'suspended'},'Affiliate suspended.')} className="border px-3 py-2 text-[10px] uppercase">Suspend</button>}{a.status!=='rejected'&&<button disabled={busy} onClick={()=>void action({action:'account_status',userId:a.user_id,status:'rejected'},'Affiliate application rejected.')} className="border border-red-200 text-red-700 px-3 py-2 text-[10px] uppercase">Reject</button>}</div>
      </article>)}
    </section>
    <section className="border bg-white p-5 space-y-3"><h2 className="font-serif text-2xl">Conversion & Commission History</h2>
      {data.commissions.length===0?<p className="text-xs text-[#777]">No affiliate sales yet.</p>:data.commissions.map((c:any)=>{const a=data.accounts.find((x:any)=>x.user_id===c.affiliate_user_id);return <div key={c.id} className="border-b py-3 flex flex-wrap justify-between gap-3 text-xs"><div><p className="font-semibold">{a?.full_name || 'Affiliate'} · {c.order_reference}</p><p className="text-[#777] mt-1">Sale ৳{Number(c.sale_amount).toLocaleString('en-BD')} · Rate {c.commission_rate}%</p></div><b>৳{Number(c.commission_amount).toLocaleString('en-BD')} · {c.status}</b></div>})}
    </section>
    <section className="border bg-white p-5 space-y-3"><h2 className="font-serif text-2xl">Payout Requests</h2>
      {data.payouts.length===0?<p className="text-xs text-[#777]">No payout requests.</p>:data.payouts.map((p:any)=>{const a=data.accounts.find((x:any)=>x.user_id===p.affiliate_user_id);return <article key={p.id} className="border p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{a?.full_name || 'Affiliate'} · ৳{Number(p.amount).toLocaleString('en-BD')}</p><p className="text-xs text-[#666]">{a?.whatsapp_number} · {new Date(p.requested_at).toLocaleString('en-BD')} · {p.status}</p></div><div className="flex flex-wrap gap-2">{p.status==='pending'&&<button disabled={busy} onClick={()=>void action({action:'payout_status',payoutId:p.id,status:'processing'},'Payout marked processing.')} className="border px-3 py-2 text-[10px] uppercase">Processing</button>}{['pending','processing'].includes(p.status)&&<button disabled={busy} onClick={()=>void action({action:'payout_status',payoutId:p.id,status:'paid'},'Payout marked paid.')} className="bg-[#173D32] text-white px-3 py-2 text-[10px] uppercase">Mark Paid</button>}{['pending','processing'].includes(p.status)&&<button disabled={busy} onClick={()=>void action({action:'payout_status',payoutId:p.id,status:'rejected'},'Payout rejected.')} className="border border-red-200 text-red-700 px-3 py-2 text-[10px] uppercase">Reject</button>}</div></article>})}
    </section>
  </div>;
}
