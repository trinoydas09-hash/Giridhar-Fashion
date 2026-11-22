import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIProviderError, generateGroundedAssistantReply } from '@/lib/ai/provider-router';
import { checkSlidingRateLimit } from '@/lib/security/rate-limit';
import {
  getAIAssistantSettings,
  getPublicStoreData,
  recordAIUsage,
  searchKnowledgeForQuery,
} from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Please enter a message before sending.')
    .max(800, 'Message is too long. Please keep it under 800 characters.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().max(1600),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'anonymous';
  }
  return req.headers.get('x-real-ip') || 'anonymous';
}

export async function GET() {
  try {
    const [aiSettings, store] = await Promise.all([
      getAIAssistantSettings(),
      getPublicStoreData(),
    ]);

    return NextResponse.json({
      is_enabled: aiSettings.is_enabled,
      availability_status: aiSettings.availability_status,
      assistant_name: aiSettings.assistant_name,
      welcome_message: aiSettings.welcome_message,
      whatsapp_support_number: aiSettings.whatsapp_support_number || store.settings.whatsapp_number,
      brand_name: store.settings.brand_name,
      currency_symbol: store.settings.currency_symbol,
      faqs: aiSettings.faqs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load assistant settings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIdentifier(req);
  const limit = checkSlidingRateLimit(`chat:${clientIp}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many messages sent. Please wait ${limit.retryAfterSeconds} seconds and try again.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid chat request.' },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;
    const [aiSettings, store] = await Promise.all([
      getAIAssistantSettings(),
      getPublicStoreData(),
    ]);

    if (!aiSettings.is_enabled || aiSettings.availability_status === 'offline') {
      return NextResponse.json(
        {
          error:
            'GIRIDHAR AI is currently offline. Please connect with our team directly via WhatsApp Support.',
          showWhatsAppSupport: true,
        },
        { status: 503 }
      );
    }

    const retrievedKnowledge = aiSettings.rag_enabled
      ? await searchKnowledgeForQuery(message, 4)
      : [];

    const result = await generateGroundedAssistantReply({
      message,
      history,
      products: store.products,
      categories: store.categories,
      promotions: store.promotions,
      offers: store.offers,
      membership: store.membership,
      settings: store.settings,
      aiSettings,
      retrievedKnowledge,
      brandExperienceFeatures: store.brand_experience_features,
      styleGuides: store.style_guides,
      surpriseBoxes: store.surprise_boxes,
    });

    const productBySlug = new Map(store.products.map((p) => [p.slug, p]));
    const recommendedProducts = result.recommended_slugs
      .map((slug) => productBySlug.get(slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    await recordAIUsage(message, result.language, history.length === 0).catch(() => {});

    return NextResponse.json({
      reply: result.reply,
      language: result.language,
      products: recommendedProducts,
      showWhatsAppSupport: result.show_whatsapp_support,
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json(
        { error: err.message, showWhatsAppSupport: true },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : 'Unable to process chat message.';
    return NextResponse.json(
      { error: msg, showWhatsAppSupport: true },
      { status: 500 }
    );
  }
}
