-- ============================================================================
-- GIRIDHAR FASHION — VIP Membership Requests, Records, Codes & RLS Policies
-- Migration: 007_vip_membership_requests.sql
-- ============================================================================

-- 1. Membership Requests Table (Public submits Pending requests only; Admin approves/rejects)
create table if not exists public.membership_requests (
  id text primary key default ('mreq-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  request_code text not null unique,
  customer_name text null,
  whatsapp_number text null,
  membership_fee numeric(10, 2) not null default 59,
  discount_percentage numeric(5, 2) not null default 20,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'rejected')),
  notes text null,
  reviewed_by text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_membership_requests_status
  on public.membership_requests (request_status, created_at desc);

create index if not exists idx_membership_requests_code
  on public.membership_requests (request_code);

-- 2. Membership Records Table (Created/Managed exclusively by Admin upon approval)
create table if not exists public.membership_records (
  id text primary key default ('mrec-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  request_id text not null unique references public.membership_requests(id) on delete cascade,
  customer_name text null,
  whatsapp_number text null,
  membership_status text not null default 'inactive' check (membership_status in ('active', 'inactive', 'expired')),
  membership_fee numeric(10, 2) not null default 59,
  discount_percentage numeric(5, 2) not null default 20,
  activated_at timestamptz null,
  expires_at timestamptz null,
  approved_by text null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_membership_records_status
  on public.membership_records (membership_status, expires_at);

-- 3. Membership Codes Table (Unique code linked to request and membership record)
create table if not exists public.membership_codes (
  id text primary key default ('mcode-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  code text not null unique,
  request_id text not null references public.membership_requests(id) on delete cascade,
  membership_record_id text null references public.membership_records(id) on delete set null,
  is_active boolean not null default false,
  activated_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_membership_codes_lookup
  on public.membership_codes (code, is_active);

-- 4. Extend order_records to track validated VIP Membership Code discounts
alter table public.order_records
  add column if not exists membership_code text null,
  add column if not exists membership_discount numeric(10, 2) default 0;

-- 5. Row Level Security Policies
alter table public.membership_requests enable row level security;
alter table public.membership_records enable row level security;
alter table public.membership_codes enable row level security;

-- Public can only submit new requests in 'pending' status (never approved/active)
create policy "Public can create pending membership requests"
  on public.membership_requests for insert
  with check (request_status = 'pending');

-- Only admins can view, approve, reject, or manage membership requests (protects customer PII)
create policy "Admins can manage membership requests"
  on public.membership_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can read or manage membership records
create policy "Admins can manage membership records"
  on public.membership_records for all
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can read or manage membership codes directly (checkout validates via server API)
create policy "Admins can manage membership codes"
  on public.membership_codes for all
  using (public.is_admin())
  with check (public.is_admin());
