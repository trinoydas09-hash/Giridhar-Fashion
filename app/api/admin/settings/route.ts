import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { updateStoreSettings } from '@/lib/services/store-repository';
import { sanitizeHref, sanitizeMediaUrl } from '@/lib/utils/format';

const settingsSchema = z.object({
  brand_name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(160),
  logo_url: z.string().trim().min(1),
  whatsapp_number: z.string().trim().min(8).max(24),
  store_email: z.string().trim().email(),
  currency_code: z.string().trim().min(3).max(5).default('BDT'),
  currency_symbol: z.string().trim().min(1).max(5).default('৳'),
  announcement_text: z.string().trim().max(240),
  announcement_active: z.boolean(),
  delivery_info: z.string().trim().max(400),
  delivery_charge_dhaka: z.number().int().min(0),
  delivery_charge_outside: z.number().int().min(0),
  free_delivery_threshold: z.number().int().min(0),
  instagram_url: z.string().trim(),
  facebook_url: z.string().trim(),
  story_title: z.string().trim().max(200),
  story_body: z.string().trim().max(1200),
  address: z.string().trim().max(260),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid store settings.' },
        { status: 400 }
      );
    }

    const s = parsed.data;
    const saved = await updateStoreSettings({
      ...s,
      logo_url: sanitizeMediaUrl(s.logo_url, '/assets/aistudio/image_32af7105.png'),
      instagram_url: sanitizeHref(s.instagram_url, 'https://instagram.com'),
      facebook_url: sanitizeHref(s.facebook_url, 'https://facebook.com'),
    });

    return NextResponse.json({ settings: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save store settings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
