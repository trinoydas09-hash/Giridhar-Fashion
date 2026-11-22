-- ============================================================================
-- GIRIDHAR FASHION — AI Shopping Assistant Settings, FAQs & Usage Logs
-- Migration: 004_ai_assistant.sql
-- ============================================================================

create table if not exists public.ai_assistant_settings (
  id text primary key default 'default-ai-settings',
  is_enabled boolean not null default true,
  availability_status text not null default 'online' check (availability_status in ('online', 'away', 'offline')),
  assistant_name text not null default 'GIRIDHAR AI',
  welcome_message text not null default 'Welcome to GIRIDHAR FASHION. Ask me in English or বাংলা about our menswear, colours, sizes, pricing, or delivery across Bangladesh.',
  whatsapp_support_number text not null default '8801711000000',
  faqs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id text primary key default ('aiu-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  topic text not null,
  language text not null default 'en' check (language in ('en', 'bn')),
  is_new_conversation boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_created on public.ai_usage_logs (created_at desc);

alter table public.ai_assistant_settings enable row level security;
alter table public.ai_usage_logs enable row level security;

-- Public storefront visitors can read enabled AI assistant configuration & FAQs
create policy "Public can read AI assistant settings"
  on public.ai_assistant_settings for select
  using (true);

-- Only authenticated admins can modify AI assistant settings & FAQs
create policy "Admins can manage AI assistant settings"
  on public.ai_assistant_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can read aggregated usage logs (inserts happen server-side via service role)
create policy "Admins can read AI usage logs"
  on public.ai_usage_logs for select
  using (public.is_admin());

insert into public.ai_assistant_settings (
  id, is_enabled, availability_status, assistant_name, welcome_message, whatsapp_support_number, faqs
) values (
  'default-ai-settings',
  true,
  'online',
  'GIRIDHAR AI',
  'Welcome to GIRIDHAR FASHION. Ask me in English or বাংলা about our menswear, colours, sizes, pricing, or delivery across Bangladesh.',
  '8801711000000',
  '[
    {"id":"faq-ordering","category":"Ordering","question":"How do I place an order at GIRIDHAR FASHION?","answer":"Select your colour and size on any product page, click Add to Cart or Buy Now, enter your delivery details at checkout, and tap Confirm Order via WhatsApp. Press Send in WhatsApp to confirm with our Dhaka concierge."},
    {"id":"faq-delivery","category":"Delivery","question":"How long does delivery take and what are the charges?","answer":"Inside Dhaka: 24–48 hours (৳80). Nationwide across Bangladesh: 2–4 business days (৳150). Orders above ৳3,500 qualify for complimentary Dhaka delivery."},
    {"id":"faq-payment","category":"Payment","question":"What payment methods are accepted?","answer":"We currently support Cash on Delivery (COD) nationwide across Bangladesh and direct confirmation through our official WhatsApp concierge."},
    {"id":"faq-returns","category":"Returns & Exchanges","question":"What is your return and size exchange policy?","answer":"Unworn items with original tags may be exchanged for another size within 7 days of delivery. Contact our WhatsApp support team with your order reference code to arrange an exchange."}
  ]'::jsonb
) on conflict (id) do nothing;
