import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { createSupabaseUserClient } from '@/lib/supabase/server';
import { deleteProduct, upsertProduct } from '@/lib/services/store-repository';
import { sanitizeMediaUrl, slugify } from '@/lib/utils/format';

const variantSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  colour: z.string().trim().min(1),
  colour_hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default('#242424'),
  size: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  stock_quantity: z.number().int().min(0),
  created_at: z.string().optional(),
});

const imageSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  url: z.string().trim().min(1),
  alt_text: z.string().trim().optional().default(''),
  display_order: z.number().int().min(1).optional().default(1),
  is_primary: z.boolean().optional().default(false),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Product name is required.').max(160),
  slug: z.string().trim().optional(),
  short_description: z.string().trim().max(260).optional().default(''),
  description: z.string().trim().min(10, 'Description should be at least 10 characters.'),
  price: z.number().int().min(1, 'Price must be positive.'),
  compare_at_price: z.number().int().min(1).nullable().optional().default(null),
  category_id: z.string().trim().min(1, 'Category is required.'),
  is_published: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  specifications: z
    .array(z.object({ label: z.string().trim().min(1), value: z.string().trim().min(1) }))
    .default([]),
  images: z.array(imageSchema).min(1, 'At least one product image is required.'),
  variants: z.array(variantSchema).min(1, 'At least one colour/size variant is required.'),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const userClient = bearer ? createSupabaseUserClient(bearer) : null;
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid product payload.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const saved = await upsertProduct({
      id: data.id,
      name: data.name,
      slug: data.slug ? slugify(data.slug) : slugify(data.name),
      short_description: data.short_description,
      description: data.description,
      price: data.price,
      compare_at_price: data.compare_at_price,
      category_id: data.category_id,
      is_published: data.is_published,
      is_featured: data.is_featured,
      is_best_seller: data.is_best_seller,
      is_new_arrival: data.is_new_arrival,
      specifications: data.specifications,
      images: data.images.map((img, i) => ({
        id: img.id || '',
        product_id: data.id || '',
        url: sanitizeMediaUrl(img.url),
        alt_text: img.alt_text || data.name,
        display_order: i + 1,
        is_primary: i === 0,
      })),
      variants: data.variants.map((v) => ({
        id: v.id || '',
        product_id: data.id || '',
        colour: v.colour,
        colour_hex: v.colour_hex,
        size: v.size,
        sku: v.sku,
        stock_status: v.stock_quantity === 0 ? 'out_of_stock' : v.stock_status,
        stock_quantity: v.stock_quantity,
        created_at: v.created_at || new Date().toISOString(),
      })),
    }, userClient ?? undefined);

    return NextResponse.json({ product: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save product.';
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
    return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
  }

  try {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const userClient = bearer ? createSupabaseUserClient(bearer) : null;
    await deleteProduct(id, userClient ?? undefined);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete product.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
