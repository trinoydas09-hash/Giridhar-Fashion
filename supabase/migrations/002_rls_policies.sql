-- ============================================================================
-- GIRIDHAR FASHION — Row Level Security (RLS) Policies & Storage Rules
-- Migration: 002_rls_policies.sql
-- ============================================================================

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.homepage_banners enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.promotions enable row level security;
alter table public.store_settings enable row level security;
alter table public.order_records enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- CATEGORIES
create policy "Public can read published categories"
  on public.categories for select
  using (is_published = true or public.is_admin());

create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- PRODUCTS
create policy "Public can read published products"
  on public.products for select
  using (is_published = true or public.is_admin());

create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- PRODUCT IMAGES
create policy "Public can read images of published products"
  on public.product_images for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published = true
    )
  );

create policy "Admins can manage product images"
  on public.product_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- PRODUCT VARIANTS
create policy "Public can read variants of published products"
  on public.product_variants for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published = true
    )
  );

create policy "Admins can manage product variants"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

-- HOMEPAGE BANNERS
create policy "Public can read active banners"
  on public.homepage_banners for select
  using (is_active = true or public.is_admin());

create policy "Admins can manage banners"
  on public.homepage_banners for all
  using (public.is_admin())
  with check (public.is_admin());

-- HOMEPAGE SECTIONS
create policy "Public can read homepage sections"
  on public.homepage_sections for select
  using (true);

create policy "Admins can manage homepage sections"
  on public.homepage_sections for all
  using (public.is_admin())
  with check (public.is_admin());

-- PROMOTIONS
create policy "Public can read active promotions"
  on public.promotions for select
  using (is_active = true or public.is_admin());

create policy "Admins can manage promotions"
  on public.promotions for all
  using (public.is_admin())
  with check (public.is_admin());

-- STORE SETTINGS
create policy "Public can read store settings"
  on public.store_settings for select
  using (true);

create policy "Admins can manage store settings"
  on public.store_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ORDER RECORDS (Public can submit new order inquiries; only Admin can read/update)
create policy "Anyone can create an order inquiry record"
  on public.order_records for insert
  with check (true);

create policy "Admins can read and manage order records"
  on public.order_records for select
  using (public.is_admin());

create policy "Admins can update order records"
  on public.order_records for update
  using (public.is_admin())
  with check (public.is_admin());

-- NEWSLETTER SUBSCRIBERS
create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers for insert
  with check (true);

create policy "Admins can read newsletter subscribers"
  on public.newsletter_subscribers for select
  using (public.is_admin());

-- SUPABASE STORAGE BUCKET: product-media
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "Public read access for product-media"
  on storage.objects for select
  using (bucket_id = 'product-media');

create policy "Admins can upload to product-media"
  on storage.objects for insert
  with check (bucket_id = 'product-media' and public.is_admin());

create policy "Admins can update product-media"
  on storage.objects for update
  using (bucket_id = 'product-media' and public.is_admin());

create policy "Admins can delete product-media"
  on storage.objects for delete
  using (bucket_id = 'product-media' and public.is_admin());
