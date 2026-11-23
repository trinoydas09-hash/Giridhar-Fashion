-- Additive Affiliate Programme schema. Does not alter existing storefront or checkout flow.
alter table public.order_records
  add column if not exists affiliate_user_id uuid references auth.users(id) on delete set null,
  add column if not exists affiliate_code text,
  add column if not exists affiliate_commission numeric(12,2);

create table if not exists public.affiliate_settings (
  id text primary key default 'global',
  global_commission_rate numeric(5,2) not null default 10
    check (global_commission_rate >= 0 and global_commission_rate <= 100),
  minimum_payout numeric(12,2) not null default 500,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.affiliate_settings (id, global_commission_rate)
values ('global', 10)
on conflict (id) do nothing;

create table if not exists public.affiliate_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  affiliate_code text not null unique,
  full_name text not null,
  email text not null,
  whatsapp_number text not null,
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_accounts(user_id) on delete cascade,
  destination_url text not null,
  link_type text not null check (link_type in ('product','category','page','custom')),
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_accounts(user_id) on delete cascade,
  affiliate_link_id uuid references public.affiliate_links(id) on delete set null,
  visitor_hash text,
  landing_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_accounts(user_id) on delete cascade,
  order_id text not null unique references public.order_records(id) on delete cascade,
  order_reference text not null,
  sale_amount numeric(12,2) not null check (sale_amount >= 0),
  commission_rate numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status text not null default 'approved' check (status in ('approved','paid','reversed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by text
);

create table if not exists public.affiliate_payout_requests (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_accounts(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected')),
  affiliate_note text,
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists idx_affiliate_links_owner on public.affiliate_links(affiliate_user_id, created_at desc);
create index if not exists idx_affiliate_clicks_owner_date on public.affiliate_clicks(affiliate_user_id, created_at desc);
create index if not exists idx_affiliate_commissions_owner_status on public.affiliate_commissions(affiliate_user_id, status, created_at desc);
create index if not exists idx_affiliate_payouts_owner_status on public.affiliate_payout_requests(affiliate_user_id, status, requested_at desc);
create index if not exists idx_order_records_affiliate on public.order_records(affiliate_user_id, created_at desc);

alter table public.affiliate_settings enable row level security;
alter table public.affiliate_accounts enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payout_requests enable row level security;

create policy "Admins manage affiliate settings" on public.affiliate_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Affiliates read own account" on public.affiliate_accounts
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "Affiliates update own contact details" on public.affiliate_accounts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending');
create policy "Admins manage affiliate accounts" on public.affiliate_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Affiliates manage own links" on public.affiliate_links
  for all to authenticated using (auth.uid() = affiliate_user_id or public.is_admin())
  with check (auth.uid() = affiliate_user_id or public.is_admin());
create policy "Affiliates read own clicks" on public.affiliate_clicks
  for select to authenticated using (auth.uid() = affiliate_user_id or public.is_admin());
create policy "Admins manage clicks" on public.affiliate_clicks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Affiliates read own commissions" on public.affiliate_commissions
  for select to authenticated using (auth.uid() = affiliate_user_id or public.is_admin());
create policy "Admins manage commissions" on public.affiliate_commissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Affiliates read own payout requests" on public.affiliate_payout_requests
  for select to authenticated using (auth.uid() = affiliate_user_id or public.is_admin());
create policy "Affiliates create own payout requests" on public.affiliate_payout_requests
  for insert to authenticated with check (auth.uid() = affiliate_user_id);
create policy "Admins manage payout requests" on public.affiliate_payout_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.affiliate_settings to authenticated;
grant select, update on public.affiliate_accounts to authenticated;
grant select, insert, update, delete on public.affiliate_links to authenticated;
grant select on public.affiliate_clicks to authenticated;
grant select on public.affiliate_commissions to authenticated;
grant select, insert on public.affiliate_payout_requests to authenticated;
