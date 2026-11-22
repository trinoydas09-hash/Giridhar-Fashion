import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { createSupabaseUserClient } from '@/lib/supabase/server';
import { adminReviewOrder, listAdminOrders } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(['accept', 'reject']),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\\s+/i, '').trim();
    const client = bearer ? createSupabaseUserClient(bearer) : null;
    const orders = await listAdminOrders(client ?? undefined);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load orders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid order action.' },
        { status: 400 }
      );
    }
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\\s+/i, '').trim();
    const client = bearer ? createSupabaseUserClient(bearer) : null;
    const order = await adminReviewOrder({
      ...parsed.data,
      adminEmail: auth.email,
      clientOverride: client ?? undefined,
    });
    return NextResponse.json({ order }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update order.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
