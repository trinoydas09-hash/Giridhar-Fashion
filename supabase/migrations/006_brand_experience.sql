-- ============================================================================
-- GIRIDHAR FASHION — Complete Brand Experience Management, Style Guides & Surprise Boxes
-- Migration: 006_brand_experience.sql
-- ============================================================================

-- 1. Brand Experience Feature Management Table (8 Features Across 3 Phases)
create table if not exists public.brand_experience_features (
  id text primary key default ('bef-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  feature_key text not null unique check (
    feature_key in (
      'style_guide',
      'vip_membership',
      'outfit_combo',
      'surprise_box',
      'gift_someone',
      'mystery_addon',
      'wardrobe_refresh',
      'gift_card'
    )
  ),
  feature_name text not null,
  phase text not null check (phase in ('Phase 1', 'Phase 2', 'Phase 3')),
  status text not null default 'coming_soon' check (status in ('enabled', 'coming_soon', 'disabled')),
  is_enabled boolean not null default false,
  is_coming_soon boolean not null default true,
  display_order integer not null default 1,
  description text not null default '',
  route_path text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_experience_order
  on public.brand_experience_features (display_order);

-- 2. Styling Guides Table (Connected to Products & Matching Recommendations)
create table if not exists public.style_guides (
  id text primary key default ('sg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  styling_recommendations text not null default '',
  outfit_combinations text not null default '',
  colour_coordination_tips text not null default '',
  occasion text not null default 'Smart Casual',
  image_url text not null default '/images/experiences/style-guide.svg',
  connected_product_ids jsonb not null default '[]'::jsonb,
  matching_product_ids jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_style_guides_published
  on public.style_guides (is_published, display_order);

-- 3. Surprise Boxes Table (Budget Tiers, Rules, Sizes & Preferences)
create table if not exists public.surprise_boxes (
  id text primary key default ('box-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null,
  slug text not null unique,
  tier_label text not null default 'Standard Box',
  price integer not null check (price >= 0),
  description text not null default '',
  selection_rules_note text not null default '',
  image_url text not null default '/images/experiences/surprise-box-standard.svg',
  included_category_ids jsonb not null default '[]'::jsonb,
  item_count integer not null default 2 check (item_count >= 1),
  available_sizes jsonb not null default '["S","M","L","XL"]'::jsonb,
  preference_options jsonb not null default '["Minimal Everyday","Smart Tailored"]'::jsonb,
  available_quantity integer not null default 10 check (available_quantity >= 0),
  is_active boolean not null default true,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_surprise_boxes_active
  on public.surprise_boxes (is_active, display_order);

-- 4. Seed Default Brand Experience Section in homepage_sections
insert into public.homepage_sections (id, section_key, title, subtitle, is_visible, display_order)
values (
  'sec-10',
  'brand_experience',
  'The GIRIDHAR Experience',
  'Curated Services & Editions',
  true,
  6
)
on conflict (section_key) do nothing;

-- 4b. Seed Default Shirt + Trouser Outfit Combo Offer
insert into public.offers
  (id, name, description, offer_type, badge_text, eligible_product_ids, eligible_category_ids, min_quantity, get_free_quantity, free_product_id, discount_percentage, discount_amount, special_bundle_price, start_date, end_date, banner_image_url, is_active)
values (
  'offer-shirt-trouser-combo',
  'Tailored Shirt + Trouser Outfit Combo — ৳3,990',
  'Pair the Dhaka Linen Mandarin Shirt with Double-Pleated Atelier Trousers for a curated outfit combo price of ৳3,990 (regularly ৳4,540).',
  'bundle_combo',
  'Outfit Combo · ৳3,990',
  '["prod-linen-mandarin-shirt","prod-pleated-trousers"]'::jsonb,
  '[]'::jsonb,
  2,
  0,
  null,
  null,
  null,
  3990,
  '2026-11-01',
  '2027-12-31',
  '/images/banners/hero-autumn-winter.svg',
  true
)
on conflict (id) do nothing;

-- 5. Seed Initial 8 Brand Experience Features
insert into public.brand_experience_features
  (id, feature_key, feature_name, phase, status, is_enabled, is_coming_soon, display_order, description, route_path)
values
  ('bef-style-guide', 'style_guide', 'GIRIDHAR STYLE GUIDE', 'Phase 1', 'enabled', true, false, 1, 'Editorial outfit pairings, colour harmony notes, and occasion styling guidance tailored to each garment.', '/style-guide'),
  ('bef-vip-membership', 'vip_membership', 'GIRIDHAR VIP MEMBERSHIP', 'Phase 1', 'enabled', true, false, 2, 'Annual private atelier privilege offering 20% savings across all collections for ৳59/year.', '/membership'),
  ('bef-outfit-combo', 'outfit_combo', 'GIRIDHAR OUTFIT COMBO', 'Phase 1', 'enabled', true, false, 3, 'Curated Shirt + Pant combinations and multi-piece bundle privileges with automatic checkout pricing.', '/offers'),
  ('bef-surprise-box', 'surprise_box', 'GIRIDHAR SURPRISE BOX', 'Phase 1', 'enabled', true, false, 4, 'Budget-tiered mystery menswear boxes curated by our Dhaka stylists around your size and aesthetic preference.', '/surprise-box'),
  ('bef-gift-someone', 'gift_someone', 'GIRIDHAR GIFT SOMEONE', 'Phase 2', 'coming_soon', false, true, 5, 'Thoughtful bespoke menswear gifting with personal notes and direct delivery to your recipient.', '/gift-someone'),
  ('bef-mystery-addon', 'mystery_addon', 'GIRIDHAR MYSTERY ADD-ON', 'Phase 2', 'coming_soon', false, true, 6, 'Curated surprise accessory companions priced for effortless pairing with any wardrobe order.', '/mystery-addon'),
  ('bef-wardrobe-refresh', 'wardrobe_refresh', 'GIRIDHAR WARDROBE REFRESH', 'Phase 3', 'coming_soon', false, true, 7, 'Interactive seasonal wardrobe planner tailored to your personal budget and silhouette preferences.', '/wardrobe-refresh'),
  ('bef-gift-card', 'gift_card', 'GIRIDHAR GIFT CARD', 'Phase 3', 'coming_soon', false, true, 8, 'Digital and printed GIRIDHAR FASHION atelier gift cards for effortless gifting across Bangladesh.', '/gift-card')
on conflict (feature_key) do nothing;

-- 6. Row Level Security Policies
alter table public.brand_experience_features enable row level security;
alter table public.style_guides enable row level security;
alter table public.surprise_boxes enable row level security;

-- Public read access only for published / non-disabled rows
create policy "Public can read active or coming soon brand experience features"
  on public.brand_experience_features for select
  using (status <> 'disabled');

create policy "Admins can manage brand experience features"
  on public.brand_experience_features for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read published style guides"
  on public.style_guides for select
  using (is_published = true);

create policy "Admins can manage style guides"
  on public.style_guides for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read active surprise boxes"
  on public.surprise_boxes for select
  using (is_active = true);

create policy "Admins can manage surprise boxes"
  on public.surprise_boxes for all
  using (public.is_admin())
  with check (public.is_admin());
