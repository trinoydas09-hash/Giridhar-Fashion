import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { updateBrandExperienceFeature } from '@/lib/services/store-repository';

const featureUpdateSchema = z.object({
  feature_key: z.enum([
    'style_guide',
    'vip_membership',
    'outfit_combo',
    'surprise_box',
    'gift_someone',
    'mystery_addon',
    'wardrobe_refresh',
    'gift_card',
  ]),
  status: z.enum(['enabled', 'coming_soon', 'disabled']),
  display_order: z.number().int().min(1).max(50).optional(),
  description: z.string().trim().max(600).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = featureUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid Brand Experience update payload.' },
        { status: 400 }
      );
    }

    const features = await updateBrandExperienceFeature(parsed.data);
    return NextResponse.json({ brand_experience_features: features }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update feature status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
