-- Ensure affiliate applications are recorded even when Supabase email confirmation
-- means signUp() does not return an authenticated session to the browser.
create or replace function public.create_pending_affiliate_account_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_whatsapp text;
begin
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_whatsapp := nullif(trim(coalesce(new.raw_user_meta_data ->> 'whatsapp_number', '')), '');
  if v_full_name is null or v_whatsapp is null then return new; end if;

  insert into public.affiliate_accounts (user_id, affiliate_code, full_name, email, whatsapp_number, status)
  values (
    new.id,
    'GF' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    left(v_full_name, 120),
    coalesce(new.email, ''),
    left(v_whatsapp, 30),
    'pending'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_pending_affiliate_from_auth_user on auth.users;
create trigger trg_create_pending_affiliate_from_auth_user
  after insert on auth.users
  for each row execute function public.create_pending_affiliate_account_from_auth_user();

-- Backfill affiliate applications created before the trigger was installed.
insert into public.affiliate_accounts (user_id, affiliate_code, full_name, email, whatsapp_number, status)
select
  u.id,
  'GF' || upper(substr(replace(u.id::text, '-', ''), 1, 8)),
  left(trim(u.raw_user_meta_data ->> 'full_name'), 120),
  coalesce(u.email, ''),
  left(trim(u.raw_user_meta_data ->> 'whatsapp_number'), 30),
  'pending'
from auth.users u
where nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '') is not null
  and nullif(trim(coalesce(u.raw_user_meta_data ->> 'whatsapp_number', '')), '') is not null
on conflict (user_id) do nothing;
