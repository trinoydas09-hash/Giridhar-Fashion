import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { testProviderConnection } from '@/lib/ai/provider-router';
import { requireAdminRequest } from '@/lib/security/auth';
import { getPublicProviderConfigs, updateProviderConfig } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';

const updateProviderSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'custom']),
  is_enabled: z.boolean(),
  selected_model: z.string().trim().min(1).max(120),
  custom_base_url: z.string().trim().max(300).nullable().optional(),
  api_key: z.string().max(400).optional(),
  label: z.string().trim().max(80).optional(),
});

const testProviderSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'custom']),
  model: z.string().trim().optional(),
  api_key: z.string().optional(),
  custom_base_url: z.string().trim().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const providers = await getPublicProviderConfigs();
    return NextResponse.json({ providers }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load AI providers.';
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
    const parsed = updateProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid AI provider settings.' },
        { status: 400 }
      );
    }

    const providers = await updateProviderConfig(parsed.data);
    return NextResponse.json({ providers }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save AI provider configuration.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = testProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid provider test request.' }, { status: 400 });
    }

    const result = await testProviderConnection(parsed.data);
    const providers = await getPublicProviderConfigs();
    return NextResponse.json({ testResult: result, providers }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Provider connection test failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
