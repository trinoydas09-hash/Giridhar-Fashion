-- Additive order approval and payment tracking. Existing checkout flow is unchanged.
alter table public.order_records
  add column if not exists membership_code text,
  add column if not exists membership_discount numeric not null default 0,
  add column if not exists payment_status text not null default 'unverified'
    check (payment_status in ('unverified', 'paid', 'unpaid')),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

alter table public.order_records drop constraint if exists order_records_status_check;
alter table public.order_records
  add constraint order_records_status_check
  check (status in ('pending_whatsapp', 'confirmed', 'rejected', 'dispatched', 'completed'));

create index if not exists idx_order_records_status_created_at
  on public.order_records (status, created_at desc);
