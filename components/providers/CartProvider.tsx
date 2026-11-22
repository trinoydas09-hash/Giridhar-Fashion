'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { evaluateCartOffers } from '@/lib/offers/engine';
import {
  BrandExperienceFeature,
  CartItem,
  Offer,
  OfferEvaluationResult,
  Product,
  ProductVariant,
  SurpriseBox,
} from '@/types/store';

const CART_STORAGE_KEY = 'giridhar_cart_v1';
const BUY_NOW_STORAGE_KEY = 'giridhar_buy_now_v1';

interface CartContextValue {
  items: CartItem[];
  buyNowItem: CartItem | null;
  hydrated: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  itemCount: number;
  subtotal: number;
  offerEvaluation: OfferEvaluationResult;
  catalogProducts: Product[];
  activeOffers: Offer[];
  brandExperienceFeatures: BrandExperienceFeature[];
  featuresLoaded: boolean;
  addItem: (product: Product, variant: ProductVariant, quantity: number) => void;
  addSurpriseBoxItem: (box: SurpriseBox, size: string, stylePreference: string, quantity: number) => void;
  setDirectBuyNow: (product: Product, variant: ProductVariant, quantity: number) => void;
  clearBuyNow: () => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  changeVariant: (oldCartItemId: string, product: Product, newVariant: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function toCartItem(product: Product, variant: ProductVariant, quantity: number): CartItem {
  return {
    id: `${product.id}::${variant.id}`,
    item_type: 'product',
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    image_url: product.images[0]?.url || '/images/products/cable-knit-forest.svg',
    variant_id: variant.id,
    colour: variant.colour,
    colour_hex: variant.colour_hex,
    size: variant.size,
    sku: variant.sku,
    unit_price: product.price,
    compare_at_price: product.compare_at_price,
    quantity: Math.max(1, Math.min(quantity, Math.max(1, variant.stock_quantity))),
    max_stock: Math.max(1, variant.stock_quantity),
  };
}

function toSurpriseBoxCartItem(
  box: SurpriseBox,
  size: string,
  stylePreference: string,
  quantity: number
): CartItem {
  const safeSize = size.trim() || box.available_sizes[0] || 'M';
  const safeStyle = stylePreference.trim() || box.preference_options[0] || 'Minimal Tailored';
  return {
    id: `box::${box.id}::${safeSize}::${safeStyle}`,
    item_type: 'surprise_box',
    product_id: box.id,
    product_slug: 'surprise-box',
    product_name: `${box.name} (${box.item_count} Pieces)`,
    image_url: box.image_url || '/images/experiences/surprise-box-standard.svg',
    variant_id: `box-${safeSize}-${safeStyle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    colour: `Style: ${safeStyle}`,
    colour_hex: '#173D32',
    size: safeSize,
    sku: `SBOX-${box.tier_label.replace(/\s+/g, '').toUpperCase().slice(0, 6)}`,
    unit_price: box.price,
    compare_at_price: null,
    quantity: Math.max(1, Math.min(quantity, Math.max(1, box.available_quantity))),
    max_stock: Math.max(1, box.available_quantity),
    box_id: box.id,
    style_preference: safeStyle,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [brandExperienceFeatures, setBrandExperienceFeatures] = useState<BrandExperienceFeature[]>([]);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
        if (rawCart) {
          const parsed = JSON.parse(rawCart);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
        const rawBuyNow = window.sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
        if (rawBuyNow) {
          const parsedBN = JSON.parse(rawBuyNow);
          if (parsedBN && parsedBN.product_id) {
            setBuyNowItem(parsedBN);
          }
        }
      } catch {
        // Ignore corrupted local storage
      } finally {
        setHydrated(true);
      }
    });

    fetch('/api/store', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            products?: Product[];
            offers?: Offer[];
            brand_experience_features?: BrandExperienceFeature[];
          } | null
        ) => {
          if (!active || !data) return;
          if (Array.isArray(data.products)) setCatalogProducts(data.products);
          if (Array.isArray(data.offers)) setActiveOffers(data.offers);
          if (Array.isArray(data.brand_experience_features)) {
            setBrandExperienceFeatures(data.brand_experience_features);
            setFeaturesLoaded(true);
          }
        }
      )
      .catch(() => {
        // Silently degrade if offer metadata fails
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, variant: ProductVariant, quantity: number) => {
    const newItem = toCartItem(product, variant, quantity);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id
            ? { ...i, quantity: Math.min(i.max_stock, i.quantity + newItem.quantity) }
            : i
        );
      }
      return [...prev, newItem];
    });
    setDrawerOpen(true);
  }, []);

  const addSurpriseBoxItem = useCallback(
    (box: SurpriseBox, size: string, stylePreference: string, quantity: number) => {
      const newItem = toSurpriseBoxCartItem(box, size, stylePreference, quantity);
      setItems((prev) => {
        const existing = prev.find((i) => i.id === newItem.id);
        if (existing) {
          return prev.map((i) =>
            i.id === newItem.id
              ? { ...i, quantity: Math.min(i.max_stock, i.quantity + newItem.quantity) }
              : i
          );
        }
        return [...prev, newItem];
      });
      setDrawerOpen(true);
    },
    []
  );

  const setDirectBuyNow = useCallback((product: Product, variant: ProductVariant, quantity: number) => {
    const direct = toCartItem(product, variant, quantity);
    setBuyNowItem(direct);
    try {
      window.sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(direct));
    } catch {
      // Ignore
    }
  }, []);

  const clearBuyNow = useCallback(() => {
    setBuyNowItem(null);
    try {
      window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== cartItemId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === cartItemId ? { ...i, quantity: Math.min(i.max_stock, quantity) } : i))
    );
  }, []);

  const changeVariant = useCallback(
    (oldCartItemId: string, product: Product, newVariant: ProductVariant) => {
      setItems((prev) => {
        const current = prev.find((i) => i.id === oldCartItemId);
        if (!current) return prev;
        const targetId = `${product.id}::${newVariant.id}`;
        const updatedItem = toCartItem(product, newVariant, current.quantity);
        const withoutOld = prev.filter((i) => i.id !== oldCartItemId);
        const existingTarget = withoutOld.find((i) => i.id === targetId);
        if (existingTarget) {
          return withoutOld.map((i) =>
            i.id === targetId
              ? { ...i, quantity: Math.min(i.max_stock, i.quantity + updatedItem.quantity) }
              : i
          );
        }
        return [...withoutOld, updatedItem];
      });
    },
    []
  );

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [items]
  );

  const offerEvaluation = useMemo(() => {
    const garmentItems = items.filter((i) => i.item_type !== 'surprise_box');
    const boxSubtotal = items
      .filter((i) => i.item_type === 'surprise_box')
      .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const garmentEval = evaluateCartOffers({
      items: garmentItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      products: catalogProducts,
      offers: activeOffers,
    });
    return {
      ...garmentEval,
      original_subtotal: garmentEval.original_subtotal + boxSubtotal,
      final_subtotal: garmentEval.final_subtotal + boxSubtotal,
    };
  }, [items, catalogProducts, activeOffers]);

  const value = useMemo(
    () => ({
      items,
      buyNowItem,
      hydrated,
      drawerOpen,
      setDrawerOpen,
      itemCount,
      subtotal,
      offerEvaluation,
      catalogProducts,
      activeOffers,
      brandExperienceFeatures,
      featuresLoaded,
      addItem,
      addSurpriseBoxItem,
      setDirectBuyNow,
      clearBuyNow,
      updateQuantity,
      changeVariant,
      removeItem,
      clearCart,
    }),
    [
      items,
      buyNowItem,
      hydrated,
      drawerOpen,
      itemCount,
      subtotal,
      offerEvaluation,
      catalogProducts,
      activeOffers,
      brandExperienceFeatures,
      featuresLoaded,
      addItem,
      addSurpriseBoxItem,
      setDirectBuyNow,
      clearBuyNow,
      updateQuantity,
      changeVariant,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
