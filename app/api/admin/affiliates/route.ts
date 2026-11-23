import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) return { response: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  const token = req.headers.get('authorization')?.replace(/^Bearer\\s+/i, '').trim();
  const client = token ? createSupabaseUserClient(token) : null;
  if (!client) return { response: NextResponse.json({ error: 'Admin database session unavailable.' }, { status: 401 }) };
  return { auth, client };
}

export async function GET(req: NextRequest) {
  const access = await authorize(req);
  if ('response' in access) return access.response;
  const { client } = access;
  const [accounts, links, clicks, commissions, payouts, settings] = await Promise.all([
    client.from('affiliate_accounts').select('*').order('created_at', { ascending: false }),
    client.from('affiliate_links').select('*').order('created_at', { ascending: false }),
    client.from('affiliate_clicks').select('affiliate_user_id'),
    client.from('affiliate_commissions').select('*').order('created_at', { ascending: false }),
    client.from('affiliate_payout_requests').select('*').order('requested_at', { ascending: false }),
    client.from('affiliate_settings').select('*').eq('id', 'global').maybeSingle(),
  ]);
  const err = accounts.error || links.error || clicks.error || commissions.error || payouts.error || settings.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({
    accounts: accounts.data || [], links: links.data || [], clicks: clicks.data || [],
    commissions: commissions.data || [], payouts: payouts.data || [], settings: settings.data,
  });
}

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('account_status'), userId: z.string().uuid(), status: z.enum(['active','suspended','rejected']) }),
  z.object({ action: z.literal('global_rate'), rate: z.number().min(0).max(100) }),
  z.object({ action: z.literal('payout_status'), payoutId: z.string().uuid(), status: z.enum(['processing','paid','rejected']), note: z.string().max(300).optional() }),
]);

export async function POST(req: NextRequest) {
  const access = await authorize(req);
  if ('response' in access) return access.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid affiliate admin action.' }, { status: 400 });
  const { client, auth } = access;
  const action = parsed.data;
  if (action.action === 'account_status') {
    const { error } = await client.from('affiliate_accounts').update({ status: action.status, updated_at: new Date().toISOString() }).eq('user_id', action.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (action.action === 'global_rate') {
    const { error } = await client.from('affiliate_settings').upsert({ id: 'global', global_commission_rate: action.rate, updated_at: new Date().toISOString(), updated_by: auth.email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const updates: Record<string, unknown> = {
      status: action.status, admin_note: action.note || null,
      reviewed_at: new Date().toISOString(), reviewed_by: auth.email,
    };
    if (action.status === 'paid') {
      const { data: payout } = await client.from('affiliate_payout_requests').select('affiliate_user_id, amount').eq('id', action.payoutId).maybeSingle();
      if (!payout) return NextResponse.json({ error: 'Payout request not found.' }, { status: 404 });
      const { data: commissions } = await client.from('affiliate_commissions').select('id, commission_amount').eq('affiliate_user_id', payout.affiliate_user_id).eq('status', 'approved').order('created_at', { ascending: true });
      let remaining = Number(payout.amount);
      for (const row of commissions || []) {
        if (remaining <= 0) break;
        if (Number(row.commission_amount) <= remaining) {
          const { error: paidError } = await client.from('affiliate_commissions').update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: auth.email }).eq('id', row.id);
          if (paidError) return NextResponse.json({ error: paidError.message }, { status: 400 });
          remaining -= Number(row.commission_amount);
        }
      }
      if (remaining > 0) return NextResponse.json({ error: 'Payout amount does not match whole approved commission entries. Adjust payout amount before marking paid.' }, { status: 400 });
    }
    const { error } = await client.from('affiliate_payout_requests').update(updates).eq('id', action.payoutId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
