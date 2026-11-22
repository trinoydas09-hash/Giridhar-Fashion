import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest } from '@/lib/security/auth';
import { updateAIAssistantSettings } from '@/lib/services/store-repository';

const faqSchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().min(1).max(60),
  question: z.string().trim().min(3).max(240),
  answer: z.string().trim().min(3).max(1000),
});

const aiSettingsSchema = z.object({
  is_enabled: z.boolean(),
  availability_status: z.enum(['online', 'away', 'offline']),
  assistant_name: z.string().trim().min(2).max(60),
  welcome_message: z.string().trim().min(5).max(500),
  whatsapp_support_number: z.string().trim().min(8).max(24),
  active_provider: z.enum(['gemini', 'openai', 'custom']).default('gemini'),
  fallback_provider: z.enum(['gemini', 'openai', 'custom']).nullable().default(null),
  system_instructions: z.string().trim().min(10).max(4000).default(
    'You are GIRIDHAR AI, the official luxury menswear concierge of GIRIDHAR FASHION (Bangladesh).'
  ),
  rag_enabled: z.boolean().default(true),
  faqs: z.array(faqSchema).max(30),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = aiSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid AI assistant settings.' },
        { status: 400 }
      );
    }

    const saved = await updateAIAssistantSettings(parsed.data);
    return NextResponse.json({ ai_settings: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save AI assistant settings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
