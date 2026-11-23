import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const client = token ? createSupabaseUserClient(token) : null;
  if (!client) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: { user }, error: authError } = await client.auth.getUser(token!);
  if (authError || !user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { data: account } = await client.from('affiliate_accounts').select('status').eq('user_id', user.id).maybeSingle();
  if (!account || account.status !== 'active') return NextResponse.json({ error: 'Your affiliate account must be approved before creating links.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.destination_url || '').trim();
  const type = body.link_type;
  if (!['product', 'category', 'page', 'custom'].includes(type)) return NextResponse.json({ error: 'Choose a valid link type.' }, { status: 400 });
  let destination: URL;
  try { destination = new URL(raw, req.nextUrl.origin); } catch { return NextResponse.json({ error: 'Enter a valid product or category URL.' }, { status: 400 }); }
  if (destination.origin !== req.nextUrl.origin || !['http:', 'https:'].includes(destination.protocol)) {
    return NextResponse.json({ error: 'Only links from this GIRIDHAR FASHION website are allowed.' }, { status: 400 });
  }
  const slug = crypto.randomBytes(5).toString('hex');
  const { data, error } = await client.from('affiliate_links').insert({
    affiliate_user_id: user.id, destination_url: destination.toString(), link_type: type, slug,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ link: { ...data, referral_url: new URL('/r/' + slug, req.nextUrl.origin).toString() } }, { status: 201 });
}
