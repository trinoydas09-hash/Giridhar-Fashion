-- Affiliate RLS must call the existing private.is_admin() helper.
-- public.is_admin() is intentionally not executable by authenticated users.
drop policy if exists "Admins manage affiliate settings" on public.affiliate_settings;
create policy "Admins manage affiliate settings" on public.affiliate_settings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Affiliates read own account" on public.affiliate_accounts;
create policy "Affiliates read own account" on public.affiliate_accounts
  for select to authenticated using (auth.uid() = user_id or private.is_admin());

drop policy if exists "Admins manage affiliate accounts" on public.affiliate_accounts;
create policy "Admins manage affiliate accounts" on public.affiliate_accounts
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Affiliates manage own links" on public.affiliate_links;
create policy "Affiliates manage own links" on public.affiliate_links
  for all to authenticated using (auth.uid() = affiliate_user_id or private.is_admin())
  with check (auth.uid() = affiliate_user_id or private.is_admin());

drop policy if exists "Affiliates read own clicks" on public.affiliate_clicks;
create policy "Affiliates read own clicks" on public.affiliate_clicks
  for select to authenticated using (auth.uid() = affiliate_user_id or private.is_admin());

drop policy if exists "Admins manage clicks" on public.affiliate_clicks;
create policy "Admins manage clicks" on public.affiliate_clicks
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Affiliates read own commissions" on public.affiliate_commissions;
create policy "Affiliates read own commissions" on public.affiliate_commissions
  for select to authenticated using (auth.uid() = affiliate_user_id or private.is_admin());

drop policy if exists "Admins manage commissions" on public.affiliate_commissions;
create policy "Admins manage commissions" on public.affiliate_commissions
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Affiliates read own payout requests" on public.affiliate_payout_requests;
create policy "Affiliates read own payout requests" on public.affiliate_payout_requests
  for select to authenticated using (auth.uid() = affiliate_user_id or private.is_admin());

drop policy if exists "Admins manage payout requests" on public.affiliate_payout_requests;
create policy "Admins manage payout requests" on public.affiliate_payout_requests
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
