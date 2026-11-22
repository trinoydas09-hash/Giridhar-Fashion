-- Small RLS and foreign-key index improvements identified by Supabase advisors.
create index if not exists idx_offers_free_product_id on public.offers(free_product_id);
alter policy "Users can view own profile" on public.profiles using ((select auth.uid()) = id);
