import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deleteBanner, saveHomepageSections, upsertBanner } from '@/lib/services/store-repository';
import { sanitizeHref, sanitizeMediaUrl } from '@/lib/utils/format';

const bannerSchema = z.object({
  type: z.literal('banner'),
  id: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().max(500).optional().default(''),
  image_url: z.string().trim().min(1),
  cta_label: z.string().trim().min(1).max(60),
  cta_href: z.string().trim().min(1),
  placement: z.enum(['hero', 'promotional']),
  display_order: z.number().int().min(1).default(1),
  is_active: z.boolean().default(true),
});

const sectionsSchema = z.object({
  type: z.literal('sections'),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      section_key: z.enum([
        'hero',
        'categories',
        'new_arrivals',
        'best_sellers',
        'featured_collections',
        'promotional_banner',
        'brand_experience',
        'brand_story',
        'social_gallery',
        'newsletter',
      ]),
      title: z.string().trim().min(1),
      subtitle: z.string().trim().default(''),
      is_visible: z.boolean(),
      display_order: z.number().int().min(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    if (body?.type === 'sections') {
      const parsed = sectionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid homepage sections payload.' }, { status: 400 });
      }
      const sections = await saveHomepageSections(parsed.data.sections);
      return NextResponse.json({ sections }, { status: 200 });
    }

    const parsed = bannerSchema.safeParse({ ...body, type: 'banner' });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid banner data.' },
        { status: 400 }
      );
    }

    const b = parsed.data;
    const saved = await upsertBanner({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      image_url: sanitizeMediaUrl(b.image_url, '/images/banners/hero-autumn-winter.svg'),
      cta_label: b.cta_label,
      cta_href: sanitizeHref(b.cta_href, '/shop'),
      placement: b.placement,
      display_order: b.display_order,
      is_active: b.is_active,
    });

    return NextResponse.json({ banner: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save homepage changes.';
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
    return NextResponse.json({ error: 'Banner ID is required.' }, { status: 400 });
  }

  try {
    await deleteBanner(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete banner.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
