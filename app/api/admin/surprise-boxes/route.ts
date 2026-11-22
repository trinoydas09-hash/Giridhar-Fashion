import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deleteSurpriseBox, upsertSurpriseBox } from '@/lib/services/store-repository';
import { sanitizeMediaUrl, slugify } from '@/lib/utils/format';

const surpriseBoxSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  tier_label: z.string().trim().min(2).max(80),
  price: z.number().min(100).max(500000),
  description: z.string().trim().min(2).max(1000),
  selection_rules_note: z.string().trim().min(2).max(1000),
  image_url: z.string().trim().min(1),
  included_category_ids: z.array(z.string()).default([]),
  item_count: z.number().int().min(1).max(20),
  available_sizes: z.array(z.string().trim().min(1)).min(1),
  preference_options: z.array(z.string().trim().min(1)).min(1),
  available_quantity: z.number().int().min(0).max(10000),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(1).max(100).default(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = surpriseBoxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid surprise box configuration.' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const surpriseBox = await upsertSurpriseBox({
      id: d.id,
      name: d.name,
      slug: d.slug && d.slug.length > 0 ? slugify(d.slug) : slugify(d.name),
      tier_label: d.tier_label,
      price: d.price,
      description: d.description,
      selection_rules_note: d.selection_rules_note,
      image_url: sanitizeMediaUrl(d.image_url, '/images/experiences/surprise-box-standard.svg'),
      included_category_ids: d.included_category_ids,
      item_count: d.item_count,
      available_sizes: d.available_sizes,
      preference_options: d.preference_options,
      available_quantity: d.available_quantity,
      is_active: d.is_active,
      display_order: d.display_order,
    });

    return NextResponse.json({ surpriseBox }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save surprise box.';
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
    return NextResponse.json({ error: 'Surprise Box ID is required.' }, { status: 400 });
  }

  try {
    await deleteSurpriseBox(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete surprise box.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
