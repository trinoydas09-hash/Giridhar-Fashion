import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProductBySlug } from '@/lib/services/store-repository';
import { Navbar } from '@/components/storefront/Navbar';
import { ProductDetailView } from '@/components/storefront/ProductDetailView';
import { Footer } from '@/components/storefront/Footer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: 'Piece Not Found',
    };
  }

  return {
    title: product.name,
    description: product.short_description || product.description.slice(0, 155),
    openGraph: {
      title: `${product.name} | GIRIDHAR FASHION`,
      description: product.short_description || product.description.slice(0, 155),
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, related, offers, styleGuides, matchingProducts, styleGuideEnabled, settings } =
    await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: {
      '@type': 'Brand',
      name: settings.brand_name,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: settings.currency_code,
      price: product.price,
      availability: product.variants.some((v) => v.stock_status !== 'out_of_stock')
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Navbar settings={settings} />
      <main className="flex-1">
        <ProductDetailView
          product={product}
          related={related}
          offers={offers}
          styleGuides={styleGuides}
          matchingProducts={matchingProducts}
          styleGuideEnabled={styleGuideEnabled}
          settings={settings}
        />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
