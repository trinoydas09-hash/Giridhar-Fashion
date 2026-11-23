create table if not exists public.membership_requests (
  id text primary key,
  request_code text not null unique,
  customer_name text,
  whatsapp_number text,
  membership_fee numeric(10,2) not null default 59 check (membership_fee >= 0),
  discount_percentage numeric(5,2) not null default 20 check (discount_percentage >= 0 and discount_percentage <= 90),
  request_status text not null default 'pending' check (request_status in ('pending','approved','rejected')),
  notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_records (
  id text primary key,
  request_id text not null unique references public.membership_requests(id) on delete cascade,
  customer_name text,
  whatsapp_number text,
  membership_status text not null default 'inactive' check (membership_status in ('active','inactive','expired')),
  membership_fee numeric(10,2) not null default 59 check (membership_fee >= 0),
  discount_percentage numeric(5,2) not null default 20 check (discount_percentage >= 0 and discount_percentage <= 90),
  activated_at timestamptz,
  expires_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_codes (
  id text primary key,
  code text not null unique,
  request_id text not null unique references public.membership_requests(id) on delete cascade,
  membership_record_id text unique references public.membership_records(id) on delete set null,
  is_active boolean not null default false,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_code_activation_guard check (
    is_active = false or (activated_at is not null and expires_at is not null and membership_record_id is not null)
  )
);

create index if not exists idx_membership_requests_created_at on public.membership_requests(created_at desc);
create index if not exists idx_membership_requests_status on public.membership_requests(request_status);
create index if not exists idx_membership_records_expires_at on public.membership_records(expires_at);
create index if not exists idx_membership_codes_active_expiry on public.membership_codes(is_active, expires_at);

alter table public.membership_requests enable row level security;
alter table public.membership_records enable row level security;
alter table public.membership_codes enable row level security;

grant select, insert, update, delete on public.membership_requests to authenticated;
grant select, insert, update, delete on public.membership_records to authenticated;
grant select, insert, update, delete on public.membership_codes to authenticated;

create policy "Admins can manage membership requests" on public.membership_requests
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "Admins can manage membership records" on public.membership_records
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "Admins can manage membership codes" on public.membership_codes
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
