import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deletePromotion, upsertPromotion } from '@/lib/services/store-repository';
import { sanitizeHref, sanitizeMediaUrl } from '@/lib/utils/format';

const promoSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(400).optional().default(''),
  discount_text: z.string().trim().min(1).max(120),
  promo_code: z.string().trim().max(40).nullable().optional().default(null),
  banner_image_url: z.string().trim().nullable().optional().default(null),
  cta_href: z.string().trim().default('/shop'),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  is_active: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = promoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid promotion payload.' },
        { status: 400 }
      );
    }

    const p = parsed.data;
    const saved = await upsertPromotion({
      id: p.id,
      title: p.title,
      description: p.description,
      discount_text: p.discount_text,
      promo_code: p.promo_code || null,
      banner_image_url: p.banner_image_url ? sanitizeMediaUrl(p.banner_image_url) : null,
      cta_href: sanitizeHref(p.cta_href, '/shop'),
      start_date: p.start_date,
      end_date: p.end_date,
      is_active: p.is_active,
    });

    return NextResponse.json({ promotion: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save promotion.';
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
    return NextResponse.json({ error: 'Promotion ID is required.' }, { status: 400 });
  }

  try {
    await deletePromotion(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete promotion.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
