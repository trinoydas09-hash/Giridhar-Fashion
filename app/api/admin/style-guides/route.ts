import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deleteStyleGuide, upsertStyleGuide } from '@/lib/services/store-repository';
import { sanitizeMediaUrl, slugify } from '@/lib/utils/format';

const styleGuideSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  summary: z.string().trim().min(2).max(500),
  styling_recommendations: z.string().trim().min(2).max(2000),
  outfit_combinations: z.string().trim().min(2).max(1200),
  colour_coordination_tips: z.string().trim().min(2).max(1200),
  occasion: z.string().trim().min(2).max(140),
  image_url: z.string().trim().min(1),
  connected_product_ids: z.array(z.string()).default([]),
  matching_product_ids: z.array(z.string()).default([]),
  is_published: z.boolean().default(true),
  display_order: z.number().int().min(1).max(100).default(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = styleGuideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid style guide data.' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const styleGuide = await upsertStyleGuide({
      id: d.id,
      title: d.title,
      slug: d.slug && d.slug.length > 0 ? slugify(d.slug) : slugify(d.title),
      summary: d.summary,
      styling_recommendations: d.styling_recommendations,
      outfit_combinations: d.outfit_combinations,
      colour_coordination_tips: d.colour_coordination_tips,
      occasion: d.occasion,
      image_url: sanitizeMediaUrl(d.image_url, '/images/experiences/style-guide.svg'),
      connected_product_ids: d.connected_product_ids,
      matching_product_ids: d.matching_product_ids,
      is_published: d.is_published,
      display_order: d.display_order,
    });

    return NextResponse.json({ styleGuide }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save style guide.';
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
    return NextResponse.json({ error: 'Style Guide ID is required.' }, { status: 400 });
  }

  try {
    await deleteStyleGuide(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete style guide.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
