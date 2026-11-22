import { NextRequest, NextResponse } from 'next/server';
import { verifyAssistantAccess } from '@/lib/security/assistant-auth';
import { getPublicStoreData } from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = verifyAssistantAccess(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const store = await getPublicStoreData();
    return NextResponse.json({
      count: store.categories.length,
      categories: store.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        url: `/shop?category=${c.slug}`,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load categories.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
