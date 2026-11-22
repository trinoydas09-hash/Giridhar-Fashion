import { NextRequest, NextResponse } from 'next/server';
import { verifyAssistantAccess } from '@/lib/security/assistant-auth';
import { getPublicProductBySlug } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const gate = verifyAssistantAccess(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const { slug } = await context.params;
    const { product, settings } = await getPublicProductBySlug(slug);

    if (!product) {
      return NextResponse.json({ error: 'Published product not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_at_price: product.compare_at_price,
      currency: settings.currency_code,
      specifications: product.specifications,
      variants: product.variants.map((v) => ({
        variant_id: v.id,
        colour: v.colour,
        colour_hex: v.colour_hex,
        size: v.size,
        sku: v.sku,
        stock_status: v.stock_status,
        stock_quantity: v.stock_quantity,
        in_stock: v.stock_status !== 'out_of_stock' && v.stock_quantity > 0,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to check product availability.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
