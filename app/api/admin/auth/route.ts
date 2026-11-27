import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkSlidingRateLimit } from '@/lib/security/rate-limit';
import {
  claimPreviewAdmin,
  getAdminAuthModeInfo,
  issueAdminSessionToken,
  requireAdminRequest,
  verifyPreviewAdminCredentials,
} from '@/lib/security/auth';

const authActionSchema = z.object({
  action: z.enum(['claim', 'login']),
  email: z.string().trim().email('Valid email is required.').optional().default('admin@giridharfashion.com'),
  password: z.string().min(4, 'Password is required.'),
});

export async function GET(req: NextRequest) {
  const info = getAdminAuthModeInfo();
  const hasAuthHeader = Boolean(req.headers.get('authorization'));
  let authenticated = false;
  let adminEmail: string | null = null;

  if (info.mode === 'supabase' || hasAuthHeader) {
    const check = await requireAdminRequest(req);
    if (check.authorized) {
      authenticated = true;
      adminEmail = check.email;
    }
  }

  return NextResponse.json({
    ...info,
    authenticated,
    adminEmail,
  });
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-real-ip')
    || req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const limit = checkSlidingRateLimit(`admin-auth:${clientIp.slice(0, 100)}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = authActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid credentials payload.' },
        { status: 400 }
      );
    }

    const info = getAdminAuthModeInfo();
    if (info.mode === 'supabase') {
      return NextResponse.json(
        { error: 'Supabase Auth is active. Sign in via Supabase client authentication.' },
        { status: 400 }
      );
    }

    const { action, email, password } = parsed.data;

    if (action === 'claim') {
      const result = claimPreviewAdmin(email, password);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const token = issueAdminSessionToken(result.email);
      return NextResponse.json({ token, email: result.email }, { status: 201 });
    }

    const valid = verifyPreviewAdminCredentials(email, password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid admin email or password.' }, { status: 401 });
    }

    const token = issueAdminSessionToken(info.claimedEmail || email);
    return NextResponse.json({ token, email: info.claimedEmail || email }, { status: 200 });
  } catch {
    // Avoid exposing internal auth/provider details to public clients.
    console.error('[admin/auth] Authentication request failed.');
    return NextResponse.json({ error: 'Authentication is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
