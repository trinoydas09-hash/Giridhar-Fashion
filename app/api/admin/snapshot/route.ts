import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/security/auth';
import { getAdminStoreSnapshot } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const snapshot = await getAdminStoreSnapshot();
    return NextResponse.json(snapshot, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load admin dashboard data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
