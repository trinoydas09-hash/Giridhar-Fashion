import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Strip the HTTP Bearer scheme before passing the JWT to Supabase.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const client = token ? createSupabaseUserClient(token) : null;
  if (!client) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: { user }, error: authError } = await client.auth.getUser(token!);
  if (authError || !user) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid payout amount.' }, { status: 400 });
  }

  const roundedAmount = Math.round(amount * 100) / 100;
  const note = String(body.note || '').slice(0, 300);
  const { data, error } = await client.rpc('request_affiliate_payout', {
    p_amount: roundedAmount,
    p_note: note,
  });

  if (error) {
    if (error.code === 'P0001') {
      const status = error.message.includes('Only active affiliates') ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Unable to submit your payout request right now.' }, { status: 500 });
  }

  return NextResponse.json({ payout: data }, { status: 201 });
}
