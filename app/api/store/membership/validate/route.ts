import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateCartOffers } from '@/lib/offers/engine';
import { checkSlidingRateLimit } from '@/lib/security/rate-limit';
import { getPublicStoreData, validateMembershipCode } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const validateSchema = z.object({
  code: z.string().trim().min(1, 'Please enter your Membership Code.').max(40),
  items: z
    .array(
      z.object({
        item_type: z.enum(['product', 'surprise_box']).optional().default('product'),
        product_id: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .optional(),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'anonymous';
  return req.headers.get('x-real-ip') || 'anonymous';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkSlidingRateLimit(`mval:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many validation attempts. Please wait ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          error: parsed.error.issues[0]?.message || 'Please enter your Membership Code.',
        },
        { status: 400 }
      );
    }

    const validation = await validateMembershipCode(parsed.data.code);
    if (!validation.valid) {
      return NextResponse.json(validation, { status: 400 });
    }

    let eligibleProductSubtotal = 0;
    if (parsed.data.items && parsed.data.items.length > 0) {
      const store = await getPublicStoreData();
      const garmentItems = parsed.data.items
        .filter((i) => i.item_type !== 'surprise_box')
        .map((i) => ({ product_id: i.product_id, quantity: i.quantity }));

      const offerEval = evaluateCartOffers({
        items: garmentItems,
        products: store.products,
        offers: store.offers,
      });
      eligibleProductSubtotal = offerEval.final_subtotal;
    }

    const discountAmount =
      eligibleProductSubtotal > 0
        ? Math.round(eligibleProductSubtotal * (validation.discountPercentage / 100))
        : 0;
    const finalProductTotal = Math.max(0, eligibleProductSubtotal - discountAmount);

    return NextResponse.json(
      {
        ...validation,
        eligibleProductSubtotal,
        discountAmount,
        finalProductTotal,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to validate membership code.';
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
