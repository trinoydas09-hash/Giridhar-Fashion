import { NextRequest, NextResponse } from 'next/server';
import { verifyAssistantAccess } from '@/lib/security/assistant-auth';
import { getPublicStoreData } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = verifyAssistantAccess(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const query = sp.get('q')?.trim().toLowerCase() || '';
    const categorySlug = sp.get('category')?.trim().toLowerCase() || '';
    const colour = sp.get('colour')?.trim().toLowerCase() || '';
    const size = sp.get('size')?.trim().toLowerCase() || '';
    const maxPriceRaw = sp.get('maxPrice');
    const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;

    const store = await getPublicStoreData();
    const catById = new Map(store.categories.map((c) => [c.id, c]));

    const filtered = store.products
      .filter((p) => {
        if (query) {
          const hay = `${p.name} ${p.short_description} ${p.description}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        if (categorySlug) {
          const cat = catById.get(p.category_id);
          if (!cat || cat.slug.toLowerCase() !== categorySlug) return false;
        }
        if (maxPrice !== null && Number.isFinite(maxPrice) && p.price > maxPrice) {
          return false;
        }
        if (colour) {
          const hasColour = p.variants.some(
            (v) => v.colour.toLowerCase() === colour && v.stock_status !== 'out_of_stock'
          );
          if (!hasColour) return false;
        }
        if (size) {
          const hasSize = p.variants.some(
            (v) => v.size.toLowerCase() === size && v.stock_status !== 'out_of_stock'
          );
          if (!hasSize) return false;
        }
        return true;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        short_description: p.short_description,
        category: catById.get(p.category_id)?.name || null,
        price: p.price,
        compare_at_price: p.compare_at_price,
        currency: store.settings.currency_code,
        is_new_arrival: p.is_new_arrival,
        is_best_seller: p.is_best_seller,
        is_featured: p.is_featured,
        primary_image: p.images[0]?.url || null,
        available_colours: Array.from(new Set(p.variants.filter((v) => v.stock_status !== 'out_of_stock').map((v) => v.colour))),
        available_sizes: Array.from(new Set(p.variants.filter((v) => v.stock_status !== 'out_of_stock').map((v) => v.size))),
        url: `/products/${p.slug}`,
      }));

    return NextResponse.json({
      count: filtered.length,
      currency: store.settings.currency_code,
      products: filtered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to query catalog.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
