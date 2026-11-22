import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { updateMembershipConfig } from '@/lib/services/store-repository';

const membershipSchema = z.object({
  id: z.string().default('default-membership'),
  is_active: z.boolean(),
  name: z.string().trim().min(3).max(120),
  tagline: z.string().trim().min(2).max(160),
  hero_description: z.string().trim().min(10).max(1000),
  price_bdt: z.number().min(0).max(50000),
  billing_period_label: z.string().trim().min(1).max(30),
  validity_text: z.string().trim().min(5).max(300),
  discount_percentage: z.number().min(0).max(90),
  promo_banner_text: z.string().trim().max(400),
  cta_button_label: z.string().trim().min(2).max(60),
  whatsapp_message_template: z.string().trim().min(10).max(1200),
  benefits: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().min(4).max(400),
      })
    )
    .max(12),
  how_it_works: z
    .array(
      z.object({
        id: z.string().min(1),
        step_number: z.number().int().min(1).max(10),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().min(4).max(400),
      })
    )
    .max(10),
  faqs: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().trim().min(4).max(240),
        answer: z.string().trim().min(4).max(800),
      })
    )
    .max(20),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = membershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid membership configuration.' },
        { status: 400 }
      );
    }

    const membership = await updateMembershipConfig({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ membership }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save membership settings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
