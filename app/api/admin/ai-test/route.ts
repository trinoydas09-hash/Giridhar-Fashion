import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIProviderError, generateGroundedAssistantReply } from '@/lib/ai/provider-router';
import { requireAdminRequest } from '@/lib/security/auth';
import {
  getAIAssistantSettings,
  getPublicStoreData,
  searchKnowledgeForQuery,
} from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const testChatSchema = z.object({
  message: z.string().trim().min(1).max(800),
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

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = testChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid test prompt.' },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;
    const [aiSettings, store] = await Promise.all([
      getAIAssistantSettings(),
      getPublicStoreData(),
    ]);

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
    });

    const productBySlug = new Map(store.products.map((p) => [p.slug, p]));
    const recommendedProducts = result.recommended_slugs
      .map((slug) => productBySlug.get(slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    return NextResponse.json({
      reply: result.reply,
      language: result.language,
      provider_used: result.provider_used,
      model_used: result.model_used,
      used_fallback: Boolean(result.used_fallback),
      showWhatsAppSupport: result.show_whatsapp_support,
      products: recommendedProducts,
      retrieved_sources: retrievedKnowledge.map((k) => ({
        title: k.document_title,
        category: k.category,
        score: k.score,
        excerpt: k.content.slice(0, 220),
      })),
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : 'Unable to execute AI test response.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
