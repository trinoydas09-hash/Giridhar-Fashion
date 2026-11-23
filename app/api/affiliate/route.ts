import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getAffiliate(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Authentication required.', status: 401 as const };
  const client = createSupabaseUserClient(token);
  if (!client) return { error: 'Affiliate service unavailable.', status: 503 as const };
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { error: 'Please sign in again.', status: 401 as const };
  return { client, user };
}

export async function GET(req: NextRequest) {
  const auth = await getAffiliate(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data: account } = await auth.client.from('affiliate_accounts').select('*').eq('user_id', auth.user.id).maybeSingle();
  if (!account) return NextResponse.json({ error: 'Affiliate account not found.' }, { status: 404 });
  const [links, clicks, commissions, payouts, settings, storeSettings] = await Promise.all([
    auth.client.from('affiliate_links').select('*').eq('affiliate_user_id', auth.user.id).order('created_at', { ascending: false }),
    auth.client.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_user_id', auth.user.id),
    auth.client.from('affiliate_commissions').select('*').eq('affiliate_user_id', auth.user.id).order('created_at', { ascending: false }),
    auth.client.from('affiliate_payout_requests').select('*').eq('affiliate_user_id', auth.user.id).order('requested_at', { ascending: false }),
    auth.client.from('affiliate_settings').select('minimum_payout').eq('id', 'global').maybeSingle(),
    auth.client.from('store_settings').select('whatsapp_number').limit(1).maybeSingle(),
  ]);
  if (links.error || clicks.error || commissions.error || payouts.error) {
    return NextResponse.json({ error: 'Unable to load affiliate dashboard.' }, { status: 500 });
  }
  const commissionRows = commissions.data || [];
  const payoutRows = payouts.data || [];
  const approved = commissionRows.filter((c) => c.status === 'approved').reduce((n, c) => n + Number(c.commission_amount), 0);
  const paid = payoutRows.filter((p) => p.status === 'paid').reduce((n, p) => n + Number(p.amount), 0);
  const reserved = payoutRows.filter((p) => ['pending', 'processing'].includes(p.status)).reduce((n, p) => n + Number(p.amount), 0);
  return NextResponse.json({
    account, links: links.data || [], clicks: clicks.count || 0, commissions: commissionRows, payouts: payoutRows,
    balance: Math.max(0, approved - reserved - paid), paid,
    whatsappNumber: storeSettings.data?.whatsapp_number || null,
    minimumPayout: Number(settings.data?.minimum_payout || 500),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAffiliate(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.full_name || '').trim().slice(0, 120);
  const whatsapp = String(body.whatsapp_number || '').trim().slice(0, 30);
  if (fullName.length < 2 || whatsapp.length < 8) return NextResponse.json({ error: 'Enter your name and WhatsApp number.' }, { status: 400 });
  const { data: existing } = await auth.client.from('affiliate_accounts').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Affiliate application already exists.' }, { status: 409 });
  const code = 'GF' + auth.user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const { error } = await auth.client.from('affiliate_accounts').insert({
    user_id: auth.user.id, affiliate_code: code, full_name: fullName,
    email: auth.user.email || '', whatsapp_number: whatsapp, status: 'pending',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, status: 'pending' }, { status: 201 });
}
