-- ============================================================================
-- GIRIDHAR FASHION — Initial Seed Data
-- Migration: 003_seed_data.sql
-- ============================================================================

insert into public.store_settings (
  id, brand_name, tagline, logo_url, whatsapp_number, store_email,
  currency_code, currency_symbol, announcement_text, announcement_active,
  delivery_info, delivery_charge_dhaka, delivery_charge_outside, free_delivery_threshold,
  instagram_url, facebook_url, story_title, story_body, address
) values (
  'default-settings',
  'GIRIDHAR FASHION',
  'Modern · Minimal · Distinct',
  '/assets/aistudio/image_32af7105.png',
  '8801711000000',
  'concierge@giridharfashion.com',
  'BDT',
  '৳',
  'Complimentary Dhaka delivery on orders above ৳3,500 · Autumn/Winter Atelier Edit now open',
  true,
  'Inside Dhaka: 24–48 hours (৳80) · Nationwide Bangladesh: 2–4 business days (৳150). Cash on Delivery available.',
  80,
  150,
  3500,
  'https://instagram.com/giridharfashion',
  'https://facebook.com/giridharfashion',
  'Tailored Calm for the Modern Bangladeshi Wardrobe',
  'Born in Dhaka with a reverence for natural fibres and quiet structure, GIRIDHAR FASHION crafts modern minimal menswear designed to endure beyond passing seasons.',
  'House 24, Road 11, Banani, Dhaka 1213, Bangladesh'
) on conflict (id) do nothing;

insert into public.homepage_sections (id, section_key, title, subtitle, is_visible, display_order) values
  ('sec-1', 'hero', 'Main Campaign Hero', 'Full-width editorial campaign showcase', true, 1),
  ('sec-2', 'categories', 'Shop by Category', 'Curated Wardrobe Pillars', true, 2),
  ('sec-3', 'new_arrivals', 'New Arrivals', 'Fresh From Our Dhaka Atelier', true, 3),
  ('sec-4', 'promotional_banner', 'Seasonal Capsule Banner', 'Editorial campaign spotlight', true, 4),
  ('sec-5', 'best_sellers', 'Best Sellers', 'Signature Client Favourites', true, 5),
  ('sec-6', 'featured_collections', 'Featured Collections', 'Refined Everyday Tailoring', true, 6),
  ('sec-7', 'brand_story', 'Our Brand Story', 'Craftsmanship & Philosophy', true, 7),
  ('sec-8', 'social_gallery', 'Journal & Lookbook', '@giridharfashion', true, 8),
  ('sec-9', 'newsletter', 'Private Dispatch', 'Early access to seasonal drops', true, 9)
on conflict (id) do nothing;

insert into public.categories (id, name, slug, description, image_url, display_order, is_published) values
  ('cat-new', 'New Arrivals', 'new-arrivals', 'Latest seasonal releases from the Dhaka atelier.', '/images/categories/new-arrivals.svg', 1, true),
  ('cat-shirts', 'Shirts', 'shirts', 'Long-staple cotton, linen, and band-collar tailored shirts.', '/images/categories/shirts.svg', 2, true),
  ('cat-tshirts', 'T-Shirts', 't-shirts', 'Heavyweight 260 GSM combed cotton tees with clean necklines.', '/images/categories/t-shirts.svg', 3, true),
  ('cat-sweaters', 'Sweaters', 'sweaters', 'Textured cable knits and merino-blend winter pullovers.', '/images/categories/sweaters.svg', 4, true),
  ('cat-hoodies', 'Hoodies', 'hoodies', 'Structured 420 GSM French terry relaxed hoodies.', '/images/categories/hoodies.svg', 5, true),
  ('cat-trousers', 'Trousers', 'trousers', 'Double-pleated tailored chinos and relaxed wool-blend trousers.', '/images/categories/trousers.svg', 6, true),
  ('cat-vintage', 'Vintage Collection', 'vintage-collection', 'Garment-dyed archival silhouettes with heritage washes.', '/images/categories/vintage.svg', 7, true),
  ('cat-accessories', 'Accessories', 'accessories', 'Full-grain leather belts, woven caps, and minimalist totes.', '/images/categories/accessories.svg', 8, true)
on conflict (id) do nothing;

insert into public.homepage_banners (id, title, subtitle, description, image_url, cta_label, cta_href, placement, display_order, is_active) values
  ('ban-hero-1', 'Autumn · Winter Atelier Edit', 'Modern · Minimal · Distinct', 'Architectural knitwear, heavyweight organic terry, and breathable Dhaka linen silhouettes crafted for quiet confidence.', '/images/banners/hero-autumn-winter.svg', 'Explore Collection', '/shop', 'hero', 1, true),
  ('ban-promo-1', 'The Vintage Canvas & Knitwear Capsule', 'Curated Seasonal Capsule', 'Discover enzyme-washed overshirts and 7-gauge cable knits finished in deep forest, burgundy, and warm neutral tones.', '/images/banners/promo-tailoring.svg', 'Shop Vintage & Knitwear', '/shop?category=vintage-collection', 'promotional', 1, true)
on conflict (id) do nothing;
