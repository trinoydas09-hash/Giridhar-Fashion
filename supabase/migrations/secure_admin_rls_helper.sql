-- Harden the admin authorization helper without breaking storefront reads.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;

alter policy "Admins can update profiles" on public.profiles to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage categories" on public.categories to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage products" on public.products to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage product images" on public.product_images to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage product variants" on public.product_variants to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage banners" on public.homepage_banners to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage homepage sections" on public.homepage_sections to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage promotions" on public.promotions to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage store settings" on public.store_settings to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can read and manage order records" on public.order_records to authenticated using (private.is_admin());
alter policy "Admins can update order records" on public.order_records to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can read newsletter subscribers" on public.newsletter_subscribers to authenticated using (private.is_admin());
alter policy "Admins can manage AI assistant settings" on public.ai_assistant_settings to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can read AI usage logs" on public.ai_usage_logs to authenticated using (private.is_admin());
alter policy "Admins can manage offers" on public.offers to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage membership configuration" on public.membership_settings to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins only for AI provider configs" on public.ai_provider_configs to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins only for knowledge documents" on public.knowledge_documents to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins only for knowledge chunks" on public.knowledge_chunks to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage brand experience features" on public.brand_experience_features to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage style guides" on public.style_guides to authenticated using (private.is_admin()) with check (private.is_admin());
alter policy "Admins can manage surprise boxes" on public.surprise_boxes to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy "Public can read published categories" on public.categories;
create policy "Public can read published categories" on public.categories for select to anon, authenticated using (is_published = true);
drop policy "Public can read published products" on public.products;
create policy "Public can read published products" on public.products for select to anon, authenticated using (is_published = true);
drop policy "Public can read images of published products" on public.product_images;
create policy "Public can read images of published products" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_published = true));
drop policy "Public can read variants of published products" on public.product_variants;
create policy "Public can read variants of published products" on public.product_variants for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_published = true));
drop policy "Public can read active banners" on public.homepage_banners;
create policy "Public can read active banners" on public.homepage_banners for select to anon, authenticated using (is_active = true);
drop policy "Public can read active promotions" on public.promotions;
create policy "Public can read active promotions" on public.promotions for select to anon, authenticated using (is_active = true);
drop policy "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

alter policy "Admins can upload to product-media" on storage.objects to authenticated with check (bucket_id = 'product-media' and private.is_admin());
alter policy "Admins can update product-media" on storage.objects to authenticated using (bucket_id = 'product-media' and private.is_admin()) with check (bucket_id = 'product-media' and private.is_admin());
alter policy "Admins can delete product-media" on storage.objects to authenticated using (bucket_id = 'product-media' and private.is_admin());

create index if not exists idx_offers_free_product_id on public.offers(free_product_id);
