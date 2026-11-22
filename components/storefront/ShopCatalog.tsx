'use client';

import React, { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Category, Offer, Product, StoreSettings } from '@/types/store';
import { ProductCard } from './ProductCard';

interface ShopCatalogProps {
  products: Product[];
  categories: Category[];
  offers?: Offer[];
  settings: StoreSettings;
  initialCategory?: string;
  initialSearch?: string;
  initialTag?: string;
}

const PAGE_SIZE = 6;

export function ShopCatalog({
  products,
  categories,
  offers = [],
  settings,
  initialCategory = '',
  initialSearch = '',
  initialTag = '',
}: ShopCatalogProps) {
  const [search, setSearch] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState(initialCategory);
  const [tagFilter, setTagFilter] = useState(initialTag);
  const [selectedColour, setSelectedColour] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [priceRange, setPriceRange] = useState<'all' | 'under-1500' | '1500-2500' | 'above-2500'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-asc' | 'price-desc'>('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allColours = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      for (const v of p.variants) {
        if (!map.has(v.colour)) map.set(v.colour, v.colour_hex);
      }
    }
    return Array.from(map.entries());
  }, [products]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const v of p.variants) set.add(v.size);
    }
    return Array.from(set);
  }, [products]);

  const catIdBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c.id])), [categories]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = products.filter((p) => {
      if (q) {
        const text = `${p.name} ${p.short_description} ${p.description} ${p.category?.name || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (categorySlug && categorySlug !== 'new-arrivals') {
        const targetId = catIdBySlug.get(categorySlug);
        if (targetId && p.category_id !== targetId) return false;
      } else if (categorySlug === 'new-arrivals') {
        if (!p.is_new_arrival) return false;
      }

      if (tagFilter === 'new' && !p.is_new_arrival) return false;
      if (tagFilter === 'bestseller' && !p.is_best_seller) return false;
      if (tagFilter === 'sale' && !(p.compare_at_price && p.compare_at_price > p.price)) return false;

      if (selectedColour) {
        const match = p.variants.some((v) => v.colour === selectedColour && v.stock_status !== 'out_of_stock');
        if (!match) return false;
      }

      if (selectedSize) {
        const match = p.variants.some((v) => v.size === selectedSize && v.stock_status !== 'out_of_stock');
        if (!match) return false;
      }

      if (priceRange === 'under-1500' && p.price >= 1500) return false;
      if (priceRange === '1500-2500' && (p.price < 1500 || p.price > 2500)) return false;
      if (priceRange === 'above-2500' && p.price <= 2500) return false;

      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => Number(b.is_new_arrival) - Number(a.is_new_arrival));
    } else {
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return sorted;
  }, [products, search, categorySlug, tagFilter, selectedColour, selectedSize, priceRange, sortBy, catIdBySlug]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const resetFilters = () => {
    setSearch('');
    setCategorySlug('');
    setTagFilter('');
    setSelectedColour('');
    setSelectedSize('');
    setPriceRange('all');
    setSortBy('featured');
    setVisibleCount(PAGE_SIZE);
  };

  const hasActiveFilters = Boolean(
    search || categorySlug || tagFilter || selectedColour || selectedSize || priceRange !== 'all'
  );

  const filterPanel = (
    <div className="space-y-7">
      {/* Search */}
      <div>
        <label htmlFor="shop-search" className="block text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2">
          Search
        </label>
        <input
          id="shop-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Search shirts, knitwear..."
          className="w-full bg-white border border-[#D8CFC0] px-3.5 py-2.5 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
        />
      </div>

      {/* Highlights */}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2.5">
          Highlights
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: '', label: 'All' },
            { key: 'new', label: 'New Arrival' },
            { key: 'bestseller', label: 'Best Seller' },
            { key: 'sale', label: 'On Sale' },
          ].map((opt) => (
            <button
              key={opt.key || 'all'}
              type="button"
              onClick={() => {
                setTagFilter(opt.key);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                tagFilter === opt.key
                  ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                  : 'bg-white text-[#242424] border-[#D8CFC0] hover:border-[#173D32]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2.5">
          Category
        </p>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setCategorySlug('');
              setVisibleCount(PAGE_SIZE);
            }}
            className={`w-full text-left px-2.5 py-1.5 text-sm transition-colors ${
              categorySlug === ''
                ? 'font-semibold text-[#173D32] bg-[#F5F0E7]'
                : 'text-[#5A5853] hover:text-[#242424]'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategorySlug(c.slug);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-sm transition-colors ${
                categorySlug === c.slug
                  ? 'font-semibold text-[#173D32] bg-[#F5F0E7]'
                  : 'text-[#5A5853] hover:text-[#242424]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2.5">
          Price ({settings.currency_code})
        </p>
        <div className="space-y-1.5">
          {[
            { value: 'all', label: 'All Prices' },
            { value: 'under-1500', label: `Under ${settings.currency_symbol}1,500` },
            { value: '1500-2500', label: `${settings.currency_symbol}1,500 – ${settings.currency_symbol}2,500` },
            { value: 'above-2500', label: `Above ${settings.currency_symbol}2,500` },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setPriceRange(item.value as typeof priceRange);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-sm transition-colors ${
                priceRange === item.value
                  ? 'font-semibold text-[#173D32] bg-[#F5F0E7]'
                  : 'text-[#5A5853] hover:text-[#242424]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colour */}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2.5">
          Colour
        </p>
        <div className="flex flex-wrap gap-2">
          {allColours.map(([colour, hex]) => {
            const active = selectedColour === colour;
            return (
              <button
                key={colour}
                type="button"
                onClick={() => {
                  setSelectedColour(active ? '' : colour);
                  setVisibleCount(PAGE_SIZE);
                }}
                title={colour}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border transition-colors ${
                  active
                    ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6]'
                    : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ backgroundColor: hex }}
                />
                <span>{colour}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] mb-2.5">
          Size
        </p>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((size) => {
            const active = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(active ? '' : size);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`min-w-[40px] px-3 py-1.5 text-xs font-medium border transition-colors ${
                  active
                    ? 'border-[#173D32] bg-[#173D32] text-[#FAF9F6]'
                    : 'border-[#D8CFC0] bg-white text-[#242424] hover:border-[#173D32]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="w-full py-2.5 border border-[#173D32] text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:bg-[#173D32] hover:text-[#FAF9F6] transition-colors"
        >
          Reset All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      {/* Header Banner */}
      <div className="pb-8 border-b border-[#E4DDD0] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
            GIRIDHAR FASHION · Menswear Archive
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#242424]">
            The Collection
          </h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 border border-[#D8CFC0] bg-white text-xs font-semibold tracking-[0.12em] uppercase text-[#242424]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <div className="flex items-center gap-2.5">
            <label htmlFor="sort-select" className="text-xs text-[#5A5853] hidden sm:inline">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white border border-[#D8CFC0] px-3.5 py-2 text-xs font-medium text-[#242424] focus:outline-none focus:border-[#173D32]"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="hidden lg:block lg:col-span-3">{filterPanel}</aside>

        <div className="lg:col-span-9">
          <div className="flex items-center justify-between mb-6 text-xs text-[#5A5853] tabular-nums">
            <span>
              Showing {displayedProducts.length} of {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'piece' : 'pieces'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[#173D32] font-medium underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>

          {displayedProducts.length === 0 ? (
            <div className="border border-[#E4DDD0] bg-[#F5F0E7]/50 p-12 text-center">
              <h2 className="font-serif text-2xl font-semibold text-[#242424] mb-2">
                No pieces match your current selection
              </h2>
              <p className="text-sm text-[#5A5853] max-w-md mx-auto mb-6">
                Try clearing a colour, size, or category filter to explore the complete GIRIDHAR FASHION archive.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold tracking-[0.14em] uppercase"
              >
                Show All Pieces
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-7">
                {displayedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    offers={offers}
                    currencySymbol={settings.currency_symbol}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="px-8 py-3.5 border border-[#173D32] text-xs font-semibold tracking-[0.16em] uppercase text-[#173D32] hover:bg-[#173D32] hover:text-[#FAF9F6] transition-colors"
                  >
                    Load More Pieces ({filteredProducts.length - displayedProducts.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div className="fixed inset-0 bg-[#173D32]/35" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 w-80 max-w-[88vw] bg-[#FAF9F6] h-full overflow-y-auto p-6 border-l border-[#E4DDD0]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E4DDD0]">
              <h2 className="font-serif text-2xl font-semibold text-[#242424]">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
