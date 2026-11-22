import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkSlidingRateLimit } from '@/lib/security/rate-limit';
import {
  createMembershipRequest,
  validateMembershipCode,
} from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const createRequestSchema = z.object({
  customer_name: z.string().trim().max(120).optional(),
  whatsapp_number: z.string().trim().max(40).optional(),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'anonymous';
  return req.headers.get('x-real-ip') || 'anonymous';
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim() || '';
  if (!code) {
    return NextResponse.json(
      { error: 'Please provide a membership code to check.' },
      { status: 400 }
    );
  }

  try {
    const result = await validateMembershipCode(code);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to check membership code.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkSlidingRateLimit(`mreq:${ip}`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many membership requests. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid membership request data.' },
        { status: 400 }
      );
    }

    const created = await createMembershipRequest({
      customerName: parsed.data.customer_name,
      whatsappNumber: parsed.data.whatsapp_number,
    });

    return NextResponse.json(
      {
        requestId: created.request.id,
        requestCode: created.requestCode,
        requestStatus: created.request.request_status,
        membershipFee: created.request.membership_fee,
        discountPercentage: created.request.discount_percentage,
        whatsappMessage: created.whatsappMessage,
        whatsappUrl: created.whatsappUrl,
        createdAt: created.request.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to create membership request right now.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
