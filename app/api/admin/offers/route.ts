import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deleteOffer, upsertOffer } from '@/lib/services/store-repository';

const offerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(800).default(''),
  offer_type: z.enum([
    'bogo_free',
    'buy_2_get_1',
    'buy_x_get_y',
    'buy_2_special_price',
    'buy_3_special_price',
    'percentage_discount',
    'fixed_discount',
    'bundle_combo',
    'custom_promo',
  ]),
  badge_text: z.string().trim().max(40).default(''),
  eligible_product_ids: z.array(z.string()).default([]),
  eligible_category_ids: z.array(z.string()).default([]),
  min_quantity: z.number().int().min(1).max(100).default(1),
  get_free_quantity: z.number().int().min(0).max(50).default(0),
  free_product_id: z.string().nullable().default(null),
  discount_percentage: z.number().min(0).max(95).nullable().default(null),
  discount_amount: z.number().min(0).max(100000).nullable().default(null),
  special_bundle_price: z.number().min(0).max(200000).nullable().default(null),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  banner_image_url: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = offerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid promotional offer data.' },
        { status: 400 }
      );
    }

    const offer = await upsertOffer(parsed.data);
    return NextResponse.json({ offer }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save promotional offer.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Offer ID is required.' }, { status: 400 });
  }

  try {
    await deleteOffer(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete offer.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
