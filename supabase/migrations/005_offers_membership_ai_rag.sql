-- ============================================================================
-- GIRIDHAR FASHION — Offers Engine, Premium Membership, Multi-Provider AI & RAG
-- Migration: 005_offers_membership_ai_rag.sql
-- ============================================================================

create extension if not exists vector;

-- ----------------------------------------------------------------------------
-- 1. ADVANCED OFFERS & COMBO BUILDER
-- ----------------------------------------------------------------------------
create table if not exists public.offers (
  id text primary key default ('offer-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null,
  description text not null default '',
  offer_type text not null check (
    offer_type in (
      'bogo_free',
      'buy_2_get_1',
      'buy_x_get_y',
      'buy_2_special_price',
      'buy_3_special_price',
      'percentage_discount',
      'fixed_discount',
      'bundle_combo',
      'custom_promo'
    )
  ),
  badge_text text not null default '',
  eligible_product_ids jsonb not null default '[]'::jsonb,
  eligible_category_ids jsonb not null default '[]'::jsonb,
  min_quantity integer not null default 1 check (min_quantity >= 1),
  get_free_quantity integer not null default 0 check (get_free_quantity >= 0),
  free_product_id text null references public.products(id) on delete set null,
  discount_percentage numeric(5, 2) null,
  discount_amount numeric(10, 2) null,
  special_bundle_price numeric(10, 2) null,
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '90 days')::date,
  banner_image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_active_dates on public.offers (is_active, start_date, end_date);

-- ----------------------------------------------------------------------------
-- 2. PREMIUM MEMBERSHIP CONFIGURATION
-- ----------------------------------------------------------------------------
create table if not exists public.membership_settings (
  id text primary key default 'default-membership',
  is_active boolean not null default true,
  name text not null default 'GIRIDHAR PREMIUM MEMBERSHIP',
  tagline text not null default 'Private Atelier Circle · Bangladesh',
  hero_description text not null default '',
  price_bdt numeric(10, 2) not null default 59,
  billing_period_label text not null default 'year',
  validity_text text not null default 'Valid for 12 months from WhatsApp registration & confirmation.',
  discount_percentage numeric(5, 2) not null default 20,
  promo_banner_text text not null default '20% discount on all products across every seasonal collection.',
  cta_button_label text not null default 'Join Membership',
  whatsapp_message_template text not null default E'Hello GIRIDHAR FASHION!\n\nI am interested in joining the Premium Membership.\n\nPlease provide me with the membership registration details.',
  benefits jsonb not null default '[]'::jsonb,
  how_it_works jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Extend order_records to record offer savings cleanly
alter table public.order_records
  add column if not exists subtotal_before_offers numeric(10, 2),
  add column if not exists offer_discount numeric(10, 2) default 0,
  add column if not exists applied_offers_summary jsonb default '[]'::jsonb,
  add column if not exists free_bonus_items jsonb default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 3. MULTI-PROVIDER AI SETTINGS & ENCRYPTED CREDENTIALS
-- ----------------------------------------------------------------------------
alter table public.ai_assistant_settings
  add column if not exists active_provider text not null default 'gemini',
  add column if not exists fallback_provider text null,
  add column if not exists system_instructions text not null default 'You are GIRIDHAR AI, the official luxury menswear concierge of GIRIDHAR FASHION (Bangladesh).',
  add column if not exists rag_enabled boolean not null default true;

create table if not exists public.ai_provider_configs (
  provider text primary key check (provider in ('gemini', 'openai', 'custom')),
  label text not null,
  is_enabled boolean not null default false,
  selected_model text not null,
  custom_base_url text null,
  encrypted_api_key text null,
  last_tested_at timestamptz null,
  last_test_status text not null default 'untested' check (last_test_status in ('untested', 'ok', 'error')),
  last_test_message text null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. AI KNOWLEDGE BASE & PGVECTOR CHUNKS (RAG)
-- ----------------------------------------------------------------------------
create table if not exists public.knowledge_documents (
  id text primary key default ('kdoc-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  title text not null,
  category text not null default 'General Brand Information',
  source_type text not null default 'manual_text' check (source_type in ('manual_text', 'pdf', 'docx', 'txt')),
  file_name text null,
  content text not null,
  chunk_count integer not null default 0,
  embedding_provider text not null default 'local',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id text primary key,
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  document_title text not null,
  category text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(768) null,
  keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_chunks_doc on public.knowledge_chunks (document_id);

-- Semantic similarity RPC for Supabase pgvector
create or replace function public.match_knowledge_chunks(
  query_embedding vector(768),
  match_count integer default 4
)
returns table (
  chunk_id text,
  document_id text,
  document_title text,
  category text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id as chunk_id,
    kc.document_id,
    kc.document_title,
    kc.category,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kd.is_enabled = true and kc.embedding is not null
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES
-- ----------------------------------------------------------------------------
alter table public.offers enable row level security;
alter table public.membership_settings enable row level security;
alter table public.ai_provider_configs enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy "Public can view active offers"
  on public.offers for select
  using (is_active = true);

create policy "Admins can manage offers"
  on public.offers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can view membership configuration"
  on public.membership_settings for select
  using (true);

create policy "Admins can manage membership configuration"
  on public.membership_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Strict admin-only access on AI provider secrets and knowledge base source records
create policy "Admins only for AI provider configs"
  on public.ai_provider_configs for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins only for knowledge documents"
  on public.knowledge_documents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins only for knowledge chunks"
  on public.knowledge_chunks for all
  using (public.is_admin())
  with check (public.is_admin());
