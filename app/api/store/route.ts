import { NextResponse } from 'next/server';
import { getPublicStoreData } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicStoreData();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load store data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
