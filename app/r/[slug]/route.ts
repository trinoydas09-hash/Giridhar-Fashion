import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.redirect(new URL('/affiliates', req.url));

  const { data: link } = await admin
    .from('affiliate_links')
    .select('id, destination_url, affiliate_user_id, affiliate_accounts!inner(affiliate_code, status)')
    .eq('slug', slug)
    .maybeSingle();

  const account = Array.isArray(link?.affiliate_accounts) ? link.affiliate_accounts[0] : link?.affiliate_accounts;
  if (!link || !account || account.status !== 'active') {
    return NextResponse.redirect(new URL('/affiliates', req.url));
  }

  const destination = new URL(link.destination_url);
  const siteOrigin = new URL(req.url).origin;
  if (destination.origin !== siteOrigin) return NextResponse.redirect(new URL('/', req.url));

  const visitor = req.headers.get('x-vercel-id') || req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('user-agent') || 'unknown';
  const visitorHash = crypto.createHash('sha256').update(visitor).digest('hex');
  await admin.from('affiliate_clicks').insert({
    affiliate_user_id: link.affiliate_user_id,
    affiliate_link_id: link.id,
    visitor_hash: visitorHash,
    landing_path: destination.pathname,
  });

  const response = NextResponse.redirect(destination);
  response.cookies.set('gf_affiliate_ref', account.affiliate_code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  response.cookies.set('gf_affiliate_user', link.affiliate_user_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
