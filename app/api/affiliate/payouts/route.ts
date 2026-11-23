import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const client = token ? createSupabaseUserClient(token) : null;
  if (!client) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: { user }, error: authError } = await client.auth.getUser(token!);
  if (authError || !user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { data: account } = await client.from('affiliate_accounts').select('status').eq('user_id', user.id).maybeSingle();
  if (!account || account.status !== 'active') return NextResponse.json({ error: 'Only active affiliates can request payouts.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a valid payout amount.' }, { status: 400 });
  const [commissions, payouts, settings] = await Promise.all([
    client.from('affiliate_commissions').select('commission_amount').eq('affiliate_user_id', user.id).eq('status', 'approved'),
    client.from('affiliate_payout_requests').select('amount').eq('affiliate_user_id', user.id).in('status', ['pending','processing','paid']),
    client.from('affiliate_settings').select('minimum_payout').eq('id', 'global').maybeSingle(),
  ]);
  if (commissions.error || payouts.error) return NextResponse.json({ error: 'Unable to verify your balance.' }, { status: 500 });
  const available = (commissions.data || []).reduce((sum, row) => sum + Number(row.commission_amount), 0)
    - (payouts.data || []).reduce((sum, row) => sum + Number(row.amount), 0);
  const minimum = Number(settings.data?.minimum_payout || 500);
  if (amount < minimum) return NextResponse.json({ error: 'Minimum payout is ৳' + minimum + '.' }, { status: 400 });
  if (amount > available) return NextResponse.json({ error: 'Requested amount exceeds your available balance.' }, { status: 400 });
  const { data, error } = await client.from('affiliate_payout_requests').insert({
    affiliate_user_id: user.id, amount, affiliate_note: String(body.note || '').slice(0, 300), status: 'pending',
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ payout: data }, { status: 201 });
}
