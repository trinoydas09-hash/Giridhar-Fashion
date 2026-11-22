# GIRIDHAR FASHION — Future AI Virtual Assistant API Documentation

This document defines the read-only integration layer exposed under `/api/v1/assistant/*` so an external AI Virtual Assistant can look up products, check colour/size stock availability, inspect delivery rules, and guide customers to WhatsApp checkout without direct database credentials.

## Security & Authentication

- **Never expose database keys or `SUPABASE_SERVICE_ROLE_KEY` to the assistant.**
- Set `ASSISTANT_API_KEY` in your server environment variables.
- When `ASSISTANT_API_KEY` is configured, every request to `/api/v1/assistant/*` **must** include:
  ```http
  x-assistant-api-key: <YOUR_ASSISTANT_API_KEY>
  ```
- Only published products (`is_published = true`), published categories, active promotions, and public store settings are returned. Draft items, private customer order records, and newsletter emails are never exposed.

---

## Endpoints

### 1. Search & Recommend Products
`GET /api/v1/assistant/products`

**Query Parameters:**
- `q` (string, optional) — Keyword match across product name and descriptions
- `category` (string, optional) — Category slug (e.g. `sweaters`, `shirts`, `hoodies`)
- `colour` (string, optional) — Filter by in-stock colour name (e.g. `Burgundy`, `Forest Green`)
- `size` (string, optional) — Filter by in-stock size (e.g. `M`, `L`)
- `maxPrice` (number, optional) — Upper price bound in BDT

**Example Response:**
```json
{
  "count": 1,
  "currency": "BDT",
  "products": [
    {
      "id": "prod-cable-knit",
      "name": "Heritage Cable Knit Sweater",
      "slug": "heritage-cable-knit-sweater",
      "short_description": "Heavyweight braided cable knit in combed cotton-merino blend.",
      "category": "Sweaters",
      "price": 2490,
      "compare_at_price": 2990,
      "currency": "BDT",
      "is_new_arrival": true,
      "is_best_seller": true,
      "is_featured": true,
      "primary_image": "/images/products/cable-knit-burgundy.svg",
      "available_colours": ["Burgundy", "Forest Green", "Beige", "Black", "Navy", "Olive"],
      "available_sizes": ["S", "M", "L", "XL"],
      "url": "/products/heritage-cable-knit-sweater"
    }
  ]
}
```

### 2. Check Product Variant Availability
`GET /api/v1/assistant/products/{slug}/availability`

**Example Response:**
```json
{
  "id": "prod-cable-knit",
  "name": "Heritage Cable Knit Sweater",
  "slug": "heritage-cable-knit-sweater",
  "price": 2490,
  "compare_at_price": 2990,
  "currency": "BDT",
  "variants": [
    {
      "variant_id": "v-ck-2",
      "colour": "Burgundy",
      "colour_hex": "#5D1E29",
      "size": "M",
      "sku": "GF-CK-BRG-M",
      "stock_status": "in_stock",
      "stock_quantity": 14,
      "in_stock": true
    }
  ]
}
```

### 3. List Categories
`GET /api/v1/assistant/categories`

Returns published categories sorted by `display_order` with storefront URLs (`/shop?category={slug}`).

### 4. Store Settings, Delivery & Promotions
`GET /api/v1/assistant/store`

Returns brand info, BDT currency configuration, Dhaka vs. nationwide delivery charges, free delivery threshold, active promotions, and WhatsApp checkout metadata (`/checkout`).

---

## Built-In GIRIDHAR AI Chat Endpoints

- `GET /api/chat` — Public storefront configuration for the `GIRIDHAR AI` widget (`is_enabled`, `availability_status`, `assistant_name`, `welcome_message`, `whatsapp_support_number`, `brand_name`, `currency_symbol`). Never exposes `GEMINI_API_KEY` or internal secrets.
- `POST /api/chat` — Server-side bilingual (Bangla & English) Gemini chat endpoint (`@google/genai`, `gemini-4-hydrogen`) protected by sliding-window IP rate limiting, Zod validation, and strict grounding in verified store data. Returns structured `{ reply, language, products, showWhatsAppSupport }`.
- `POST /api/admin/ai-settings` — Admin-protected route (`requireAdminRequest`) for toggling `is_enabled`, updating `availability_status`, editing welcome/WhatsApp settings, and managing approved FAQs.
