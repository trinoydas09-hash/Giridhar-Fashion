-- ============================================================================
-- GIRIDHAR FASHION — Initial Supabase PostgreSQL Schema
-- Migration: 001_initial_schema.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. User Profiles & Role Management
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automatically provision profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper function to check admin role safely inside RLS policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2. Categories
create table if not exists public.categories (
  id text primary key default ('cat-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_slug on public.categories (slug);
create index if not exists idx_categories_published_order on public.categories (is_published, display_order);

-- 3. Products
create table if not exists public.products (
  id text primary key default ('prod-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),
  category_id text references public.categories (id) on delete set null,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  specifications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_slug on public.products (slug);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_flags on public.products (is_published, is_featured, is_best_seller, is_new_arrival);

-- 4. Product Images
create table if not exists public.product_images (
  id text primary key default ('img-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  product_id text not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text not null default '',
  display_order integer not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on public.product_images (product_id, display_order);

-- 5. Product Variants (Colour + Size + SKU + Stock)
create table if not exists public.product_variants (
  id text primary key default ('var-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  product_id text not null references public.products (id) on delete cascade,
  colour text not null,
  colour_hex text not null default '#242424',
  size text not null,
  sku text not null,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, colour, size)
);

create index if not exists idx_product_variants_product on public.product_variants (product_id);
create index if not exists idx_product_variants_sku on public.product_variants (sku);

-- 6. Homepage Banners
create table if not exists public.homepage_banners (
  id text primary key default ('ban-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  image_url text not null default '',
  cta_label text not null default 'Explore Collection',
  cta_href text not null default '/shop',
  placement text not null default 'hero' check (placement in ('hero', 'promotional')),
  display_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. Homepage Section Ordering & Visibility
create table if not exists public.homepage_sections (
  id text primary key,
  section_key text not null unique,
  title text not null,
  subtitle text not null default '',
  is_visible boolean not null default true,
  display_order integer not null default 1
);

-- 8. Promotional Campaigns
create table if not exists public.promotions (
  id text primary key default ('promo-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  title text not null,
  description text not null default '',
  discount_text text not null default '',
  promo_code text,
  banner_image_url text,
  cta_href text not null default '/shop',
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 9. Store Settings (Single-Row Configuration)
create table if not exists public.store_settings (
  id text primary key default 'default-settings',
  brand_name text not null default 'GIRIDHAR FASHION',
  tagline text not null default 'Modern · Minimal · Distinct',
  logo_url text not null default '/assets/aistudio/image_32af7105.png',
  whatsapp_number text not null default '8801711000000',
  store_email text not null default 'concierge@giridharfashion.com',
  currency_code text not null default 'BDT',
  currency_symbol text not null default '৳',
  announcement_text text not null default '',
  announcement_active boolean not null default true,
  delivery_info text not null default '',
  delivery_charge_dhaka integer not null default 80,
  delivery_charge_outside integer not null default 150,
  free_delivery_threshold integer not null default 3500,
  instagram_url text not null default '',
  facebook_url text not null default '',
  story_title text not null default '',
  story_body text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);

-- 10. WhatsApp Order Records
create table if not exists public.order_records (
  id text primary key default ('ord-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  reference_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  notes text,
  items jsonb not null default '[]'::jsonb,
  total_amount integer not null check (total_amount >= 0),
  channel text not null default 'whatsapp_cart' check (channel in ('whatsapp_cart', 'whatsapp_buy_now')),
  status text not null default 'pending_whatsapp' check (status in ('pending_whatsapp', 'confirmed', 'dispatched', 'completed')),
  created_at timestamptz not null default now()
);

-- 11. Newsletter Subscribers
create table if not exists public.newsletter_subscribers (
  id text primary key default ('sub-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  email text not null unique,
  created_at timestamptz not null default now()
);
