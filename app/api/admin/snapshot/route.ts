import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/security/auth';
import { getAdminStoreSnapshot } from '@/lib/services/store-repository';
import { createSupabaseUserClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const userClient = bearer ? createSupabaseUserClient(bearer) : null;
    const snapshot = await getAdminStoreSnapshot(userClient ?? undefined);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load admin dashboard data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
