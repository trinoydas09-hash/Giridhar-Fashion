# GIRIDHAR FASHION — Modern Minimal Luxury Menswear Platform

A production-ready Next.js, TypeScript, Tailwind CSS, and Supabase e-commerce platform built for **GIRIDHAR FASHION** (Bangladesh), featuring variant-driven shopping, persistent cart management, WhatsApp click-to-chat checkout, a protected Admin Dashboard, and a read-only integration layer for a future AI Virtual Assistant.

## Brand System
- **Primary Colour:** Deep Forest Green (`#173D32`)
- **Secondary Colour:** Warm Cream (`#F5F0E7`)
- **Accent Colour:** Muted Gold (`#B99A61`)
- **Text Colour:** Charcoal (`#242424`)
- **Canvas Background:** Off-White (`#FAF9F6`)
- **Typography:** `Cormorant Garamond` (display) & `Plus Jakarta Sans` (body)

## Architecture Overview
- **Customer Storefront:**
  - `/` — Configurable homepage (Hero, Categories, New Arrivals, Promotional Banner, Best Sellers, Featured Collections, Brand Story, Lookbook, Newsletter)
  - `/shop` — Filterable catalogue (search, category, highlights, price range, colour swatches, sizes, sort, pagination)
  - `/products/[slug]` — Multi-image PDP with mandatory colour & size variant selection, live SKU/stock checks, Add to Cart, and direct Buy Now
  - `/cart` — Persistent shopping bag with variant switcher, live offer evaluation, and quantity steppers
  - `/offers` — Curated active Offers & Combos showcase with eligible products
  - `/membership` — Dedicated GIRIDHAR PREMIUM MEMBERSHIP (`৳59/year`, `20%` discount) page with manual WhatsApp inquiry generation
  - `/checkout` — Multi-item Cart & single-item Buy Now WhatsApp checkout with server-verified offer calculation and UTF-8 message encoding
- **Protected Admin Dashboard (`/admin`):**
  - Dual-mode authentication: **Supabase Auth** (`profiles.role = 'admin'`) when Supabase credentials are set, or a secure **First-Run Setup Claim / Passcode** login in preview mode
  - Product & Variant Matrix CRUD (colours, hex swatches, sizes, SKUs, stock quantities)
  - Category management, Homepage Banner & Section Order manager, **Advanced Offers & Combo Builder** (BOGO, Buy X Get Y, Buy 2/3 Special Price, Percentage/Fixed, Bundles), **Premium Membership Editor**, Campaigns, Store Settings, and Image Upload
- **Unified Multi-Provider AI & Knowledge Base (RAG):**
  - Floating bilingual (Bangla & English) storefront assistant (`GIRIDHAR AI`) supporting **Google Gemini**, **OpenAI (ChatGPT)**, and **Custom OpenAI-Compatible** endpoints with automatic fallback routing
  - AES-256-GCM encrypted server-side credential storage (never exposed to browser code) + connection tester & Live Admin Test Chat Console
  - **RAG Knowledge Base:** Upload `.pdf`, `.docx`, `.txt`, or manual brand policies; automatically extracted, chunked, embedded (`pgvector` in Supabase), and retrieved into AI context alongside live products, active offers, and membership details
  - External read-only assistant endpoints (`/api/v1/assistant/*`): see [`docs/AI_ASSISTANT_API.md`](docs/AI_ASSISTANT_API.md).

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Connecting Supabase (Database, Auth & Storage)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`
   - `supabase/migrations/004_ai_assistant.sql`
   - `supabase/migrations/005_offers_membership_ai_rag.sql`
3. Create your admin user in **Authentication -> Users**, then promote that user in SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin@giridharfashion.com';
   ```
4. Add your credentials to `.env.local` (or Vercel Environment Variables):
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
   SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
   ```
   > **Security Notice:** Never expose `GEMINI_API_KEY`, `OPENAI_API_KEY`, `CREDENTIALS_ENCRYPTION_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository in **Vercel** (`Next.js` framework preset).
3. Configure all environment variables from `.env.example` in **Project Settings -> Environment Variables**:
   - `GEMINI_API_KEY` (or save provider keys encrypted in `/admin`)
   - `OPENAI_API_KEY` (optional)
   - `CREDENTIALS_ENCRYPTION_KEY` (recommended 32+ char secret for provider vault)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SESSION_SECRET`
   - `ASSISTANT_API_KEY` (optional, for external `/api/v1/assistant/*` access)
   - `APP_URL` (your production domain, e.g. `https://giridharfashion.com`)
4. Deploy with `npm run build`.
