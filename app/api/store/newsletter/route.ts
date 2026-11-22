import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { subscribeNewsletter } from '@/lib/services/store-repository';

const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email address.' },
        { status: 400 }
      );
    }
    const result = await subscribeNewsletter(parsed.data.email);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to subscribe right now.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
