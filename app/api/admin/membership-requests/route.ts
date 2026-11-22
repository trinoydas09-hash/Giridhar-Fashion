import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import {
  adminProcessMembershipRequest,
  listMembershipRequestViews,
} from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const adminActionSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required.'),
  action: z.enum(['approve', 'reject', 'activate', 'deactivate']),
  customerName: z.string().trim().max(120).optional(),
  whatsappNumber: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(400).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const requests = await listMembershipRequestViews();
    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to load VIP membership requests.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid membership action request.' },
        { status: 400 }
      );
    }

    const updated = await adminProcessMembershipRequest({
      ...parsed.data,
      adminEmail: auth.email,
    });
    return NextResponse.json({ request: updated }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to update VIP membership request.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
