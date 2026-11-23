-- Production hardening for the affiliate programme.
-- This migration is additive and does not modify existing storefront/order data.

-- Trigger functions are invoked by their trigger; they must not be callable as public RPC endpoints.
revoke execute on function public.create_pending_affiliate_account_from_auth_user() from public, anon, authenticated;

-- Cover the affiliate_link_id foreign key used when links are joined/deleted.
create index if not exists idx_affiliate_clicks_link_id
  on public.affiliate_clicks (affiliate_link_id);

-- Avoid per-row auth function evaluation in affiliate RLS policies.
drop policy if exists "Affiliates create own pending account" on public.affiliate_accounts;
create policy "Affiliates create own pending account" on public.affiliate_accounts
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

drop policy if exists "Affiliates read own account" on public.affiliate_accounts;
create policy "Affiliates read own account" on public.affiliate_accounts
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists "Affiliates update own contact details" on public.affiliate_accounts;
create policy "Affiliates update own contact details" on public.affiliate_accounts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'pending');

drop policy if exists "Affiliates manage own links" on public.affiliate_links;
create policy "Affiliates manage own links" on public.affiliate_links
  for all to authenticated
  using ((select auth.uid()) = affiliate_user_id or (select private.is_admin()))
  with check ((select auth.uid()) = affiliate_user_id or (select private.is_admin()));

drop policy if exists "Affiliates read own clicks" on public.affiliate_clicks;
create policy "Affiliates read own clicks" on public.affiliate_clicks
  for select to authenticated
  using ((select auth.uid()) = affiliate_user_id or (select private.is_admin()));

drop policy if exists "Affiliates read own commissions" on public.affiliate_commissions;
create policy "Affiliates read own commissions" on public.affiliate_commissions
  for select to authenticated
  using ((select auth.uid()) = affiliate_user_id or (select private.is_admin()));

drop policy if exists "Affiliates read own payout requests" on public.affiliate_payout_requests;
create policy "Affiliates read own payout requests" on public.affiliate_payout_requests
  for select to authenticated
  using ((select auth.uid()) = affiliate_user_id or (select private.is_admin()));

drop policy if exists "Affiliates create own pending payout requests" on public.affiliate_payout_requests;
create policy "Affiliates create own pending payout requests" on public.affiliate_payout_requests
  for insert to authenticated
  with check ((select auth.uid()) = affiliate_user_id and status = 'pending');

-- Serialize payout requests per affiliate inside the database transaction.
-- SECURITY INVOKER keeps the caller subject to the existing RLS policies.
create or replace function public.request_affiliate_payout(
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_account_status text;
  v_available numeric(12,2);
  v_minimum numeric(12,2);
  v_payout public.affiliate_payout_requests%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'Authentication required.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception using errcode = 'P0001', message = 'Enter a valid payout amount with up to 2 decimal places.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select status into v_account_status
  from public.affiliate_accounts
  where user_id = v_user_id;

  if v_account_status is distinct from 'active' then
    raise exception using errcode = 'P0001', message = 'Only active affiliates can request payouts.';
  end if;

  select coalesce(sum(commission_amount), 0)
  into v_available
  from public.affiliate_commissions
  where affiliate_user_id = v_user_id and status = 'approved';

  select coalesce(sum(amount), 0)
  into v_minimum
  from public.affiliate_payout_requests
  where affiliate_user_id = v_user_id and status in ('pending', 'processing', 'paid');

  v_available := v_available - v_minimum;

  select coalesce(minimum_payout, 500)
  into v_minimum
  from public.affiliate_settings
  where id = 'global';

  if p_amount < coalesce(v_minimum, 500) then
    raise exception using errcode = 'P0001',
      message = 'Minimum payout is ৳' || coalesce(v_minimum, 500)::text || '.';
  end if;

  if p_amount > v_available then
    raise exception using errcode = 'P0001',
      message = 'Requested amount exceeds your available balance.';
  end if;

  insert into public.affiliate_payout_requests (
    affiliate_user_id, amount, affiliate_note, status
  ) values (
    v_user_id, p_amount, left(coalesce(p_note, ''), 300), 'pending'
  )
  returning * into v_payout;

  return to_jsonb(v_payout);
end;
$$;

revoke all on function public.request_affiliate_payout(numeric, text) from public, anon;
grant execute on function public.request_affiliate_payout(numeric, text) to authenticated;
