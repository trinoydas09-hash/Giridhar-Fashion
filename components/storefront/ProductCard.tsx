'use client';

import Link from 'next/link';
import { getActiveOffersForProduct } from '@/lib/offers/engine';
import { calculateDiscountPercent, formatPrice } from '@/lib/utils/format';
import { Offer, Product } from '@/types/store';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
  offers?: Offer[];
}

export function ProductCard({ product, currencySymbol = '৳', offers = [] }: ProductCardProps) {
  const primaryImage = product.images[0]?.url || '/images/products/cable-knit-forest.svg';
  const secondaryImage = product.images[1]?.url;
  const discount = calculateDiscountPercent(product.price, product.compare_at_price);
  const eligibleOffers = getActiveOffersForProduct(product, offers);
  const leadOffer = eligibleOffers[0];

  const uniqueColours = Array.from(
    new Map(product.variants.map((v) => [v.colour, v.colour_hex])).entries()
  );

  // Maximum 1 subtle editorial text tag per card (active offer badge takes priority cleanly)
  let editorialTag: string | null = null;
  if (leadOffer?.badge_text) {
    editorialTag = leadOffer.badge_text;
  } else if (leadOffer) {
    editorialTag = 'Special Offer';
  } else if (discount) {
    editorialTag = `${discount}% Off`;
  } else if (product.is_new_arrival) {
    editorialTag = 'New Arrival';
  } else if (product.is_best_seller) {
    editorialTag = 'Best Seller';
  }

  const allOutOfStock = product.variants.every(
    (v) => v.stock_status === 'out_of_stock' || v.stock_quantity === 0
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F0E7] border border-[#E6DFD3]">
        <SafeImage
          src={primaryImage}
          alt={product.images[0]?.alt_text || product.name}
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
            secondaryImage ? 'group-hover:opacity-0' : ''
          }`}
        />
        {secondaryImage && (
          <SafeImage
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
          />
        )}

        {editorialTag && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] uppercase border ${
              leadOffer
                ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                : 'bg-[#FAF9F6]/92 text-[#173D32] border-[#E6DFD3]'
            }`}
          >
            {editorialTag}
          </span>
        )}

        {allOutOfStock && (
          <span className="absolute bottom-3 left-3 bg-[#242424] px-2.5 py-1 text-[11px] font-medium tracking-[0.1em] uppercase text-[#FAF9F6]">
            Sold Out
          </span>
        )}
      </div>

      <div className="pt-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#5A5853]">
          <span className="truncate">
            {product.category?.name || 'Menswear'} · {uniqueColours.length}{' '}
            {uniqueColours.length === 1 ? 'Colour' : 'Colours'}
          </span>

          {uniqueColours.length > 0 && (
            <div className="flex items-center gap-1 shrink-0" aria-label="Available colours">
              {uniqueColours.slice(0, 4).map(([colour, hex]) => (
                <span
                  key={colour}
                  title={colour}
                  className="w-2.5 h-2.5 rounded-full border border-[#242424]/25"
                  style={{ backgroundColor: hex }}
                />
              ))}
              {uniqueColours.length > 4 && (
                <span className="text-[11px] text-[#5A5853]">+{uniqueColours.length - 4}</span>
              )}
            </div>
          )}
        </div>

        <h3 className="font-sans text-[15px] font-semibold text-[#242424] group-hover:text-[#173D32] transition-colors leading-snug line-clamp-1">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2.5 tabular-nums text-[15px]">
          <span className="font-semibold text-[#173D32]">
            {formatPrice(product.price, currencySymbol)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-[#7A756D] line-through">
              {formatPrice(product.compare_at_price, currencySymbol)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
