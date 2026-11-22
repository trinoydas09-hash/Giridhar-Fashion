import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { deleteCategory, upsertCategory } from '@/lib/services/store-repository';
import { sanitizeMediaUrl, slugify } from '@/lib/utils/format';

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Category name is required.').max(100),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(300).optional().default(''),
  image_url: z.string().trim().optional().default('/images/categories/shirts.svg'),
  display_order: z.number().int().min(0).default(1),
  is_published: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid category data.' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const saved = await upsertCategory({
      id: d.id,
      name: d.name,
      slug: d.slug ? slugify(d.slug) : slugify(d.name),
      description: d.description,
      image_url: sanitizeMediaUrl(d.image_url, '/images/categories/shirts.svg'),
      display_order: d.display_order,
      is_published: d.is_published,
    });

    return NextResponse.json({ category: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save category.';
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
    return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
  }

  try {
    await deleteCategory(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete category.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
