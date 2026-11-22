import { GoogleGenAI, Type } from '@google/genai';
import { OFFER_TYPE_LABELS, isOfferCurrentlyValid } from '@/lib/offers/engine';
import {
  PROVIDER_DEFAULT_MODELS,
  recordProviderTestResult,
  resolveServerProviderCredentials,
} from '@/lib/security/secrets';
import {
  AIAssistantSettings,
  AIProviderId,
  BrandExperienceFeature,
  Category,
  MembershipConfig,
  Offer,
  Product,
  Promotion,
  RetrievedKnowledgeHit,
  StoreSettings,
  StyleGuide,
  SurpriseBox,
} from '@/types/store';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GiridharAiOutput {
  reply: string;
  language: 'bn' | 'en';
  recommended_slugs: string[];
  show_whatsapp_support: boolean;
  provider_used?: AIProviderId;
  model_used?: string;
  used_fallback?: boolean;
}

export class AIProviderError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = 'AIProviderError';
    this.status = status;
  }
}

export function buildGroundedContext(params: {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  offers: Offer[];
  membership: MembershipConfig;
  settings: StoreSettings;
  aiSettings: AIAssistantSettings;
  retrievedKnowledge: RetrievedKnowledgeHit[];
  brandExperienceFeatures?: BrandExperienceFeature[];
  styleGuides?: StyleGuide[];
  surpriseBoxes?: SurpriseBox[];
}) {
  const {
    products,
    categories,
    promotions,
    offers,
    membership,
    settings,
    aiSettings,
    retrievedKnowledge,
    brandExperienceFeatures = [],
    styleGuides = [],
    surpriseBoxes = [],
  } = params;

  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const compactCatalog = products
    .filter((p) => p.is_published)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category?.name || 'Menswear',
      price_bdt: p.price,
      compare_at_price_bdt: p.compare_at_price,
      short_description: p.short_description,
      description: p.description,
      is_new_arrival: p.is_new_arrival,
      is_best_seller: p.is_best_seller,
      is_featured: p.is_featured,
      specifications: p.specifications,
      variants: p.variants.map((v) => ({
        colour: v.colour,
        size: v.size,
        sku: v.sku,
        stock_status: v.stock_status,
        stock_quantity: v.stock_quantity,
      })),
    }));

  const compactOffers = offers
    .filter((o) => isOfferCurrentlyValid(o))
    .map((o) => ({
      name: o.name,
      type: OFFER_TYPE_LABELS[o.offer_type] || o.offer_type,
      badge: o.badge_text,
      description: o.description,
      eligible_products:
        o.eligible_product_ids.length > 0
          ? o.eligible_product_ids.map((id) => productNameById.get(id) || id)
          : ['Any eligible catalog item in eligible categories or storewide'],
      eligible_categories:
        o.eligible_category_ids.length > 0
          ? o.eligible_category_ids.map((id) => categoryNameById.get(id) || id)
          : [],
      min_purchase_quantity: o.min_quantity,
      free_quantity: o.get_free_quantity,
      free_bonus_product: o.free_product_id ? productNameById.get(o.free_product_id) || null : null,
      discount_percentage: o.discount_percentage,
      discount_amount_bdt: o.discount_amount,
      special_bundle_price_bdt: o.special_bundle_price,
      valid_until: o.end_date,
    }));

  return JSON.stringify({
    VERIFIED_STORE_SETTINGS: {
      brand_name: settings.brand_name,
      tagline: settings.tagline,
      currency: `${settings.currency_code} (${settings.currency_symbol})`,
      delivery_info: settings.delivery_info,
      delivery_charge_dhaka_bdt: settings.delivery_charge_dhaka,
      delivery_charge_outside_bdt: settings.delivery_charge_outside,
      free_delivery_threshold_bdt: settings.free_delivery_threshold,
      whatsapp_support_number: aiSettings.whatsapp_support_number || settings.whatsapp_number,
      store_email: settings.store_email,
      address: settings.address,
      checkout_flow: 'WhatsApp Click-to-Chat Checkout (/checkout) with Cash on Delivery across Bangladesh',
    },
    VERIFIED_CATEGORIES: categories
      .filter((c) => c.is_published)
      .map((c) => ({ name: c.name, slug: c.slug, description: c.description })),
    VERIFIED_ACTIVE_OFFERS_AND_COMBOS: compactOffers,
    VERIFIED_PROMOTIONS: promotions
      .filter((p) => p.is_active)
      .map((p) => ({
        title: p.title,
        discount_text: p.discount_text,
        description: p.description,
        promo_code: p.promo_code,
        end_date: p.end_date,
      })),
    VERIFIED_PREMIUM_MEMBERSHIP: membership.is_active
      ? {
          name: membership.name,
          fee_bdt: membership.price_bdt,
          billing_period: membership.billing_period_label,
          discount_percentage_on_all_products: membership.discount_percentage,
          validity: membership.validity_text,
          page_url: '/membership',
          how_to_join:
            'Visit /membership and click Join VIP Membership. A unique Membership Request Code (GF-XXXXXX) is generated and WhatsApp opens with a pre-filled message. After confirmation and payment, GIRIDHAR FASHION approves and activates the Membership Code for 1 year so you can apply it at /checkout for 20% off products (delivery charges excluded).',
          benefits: membership.benefits.map((b) => `${b.title}: ${b.description}`),
          faqs: membership.faqs,
        }
      : null,
    VERIFIED_BRAND_EXPERIENCE_FEATURES: brandExperienceFeatures
      .filter((f) => f.status !== 'disabled')
      .map((f) => ({
        name: f.feature_name,
        status: f.status,
        page_url: f.route_path,
        description: f.description,
      })),
    VERIFIED_STYLE_GUIDES: styleGuides
      .filter((g) => g.is_published)
      .map((g) => ({
        title: g.title,
        occasion: g.occasion,
        summary: g.summary,
        styling_recommendations: g.styling_recommendations,
        outfit_combinations: g.outfit_combinations,
        colour_coordination_tips: g.colour_coordination_tips,
        connected_products: g.connected_product_ids.map((id) => productNameById.get(id) || id),
        matching_products: g.matching_product_ids.map((id) => productNameById.get(id) || id),
        page_url: '/style-guide',
      })),
    VERIFIED_SURPRISE_BOXES: surpriseBoxes
      .filter((b) => b.is_active)
      .map((b) => ({
        name: b.name,
        tier: b.tier_label,
        price_bdt: b.price,
        item_count: b.item_count,
        included_categories: b.included_category_ids.map((id) => categoryNameById.get(id) || id),
        available_sizes: b.available_sizes,
        style_preferences: b.preference_options,
        available_quantity: b.available_quantity,
        curation_disclosure: b.selection_rules_note,
        page_url: '/surprise-box',
      })),
    APPROVED_FAQS: aiSettings.faqs,
    RETRIEVED_KNOWLEDGE_BASE: retrievedKnowledge.map((hit) => ({
      title: hit.document_title,
      category: hit.category,
      excerpt: hit.content,
    })),
    VERIFIED_STORE_CATALOG: compactCatalog,
  });
}

function buildSystemInstruction(customInstructions: string): string {
  const base =
    customInstructions?.trim() ||
    'You are GIRIDHAR AI, the official shopping assistant of GIRIDHAR FASHION (Bangladesh).';

  return `${base}

CRITICAL GROUNDING & RESPONSE RULES:
- Use ONLY the VERIFIED_STORE_CATALOG, VERIFIED_CATEGORIES, VERIFIED_ACTIVE_OFFERS_AND_COMBOS, VERIFIED_PREMIUM_MEMBERSHIP, VERIFIED_BRAND_EXPERIENCE_FEATURES, VERIFIED_STYLE_GUIDES, VERIFIED_SURPRISE_BOXES, VERIFIED_PROMOTIONS, VERIFIED_STORE_SETTINGS, APPROVED_FAQS, and RETRIEVED_KNOWLEDGE_BASE provided in the JSON context.
- Never invent prices, stock, sizes, colours, bundle deals, membership terms, surprise box contents, or delivery/return/refund policies.
- If asked about active offers, bundle discounts, or Buy X Get Y deals, explain the exact active offers from VERIFIED_ACTIVE_OFFERS_AND_COMBOS accurately.
- If asked about membership, explain the verified fee (৳59/year), 20% product discount (delivery charges excluded), validity, and that clicking "Join VIP Membership" on /membership generates a unique Membership Request Code and opens WhatsApp; once approved and activated by GIRIDHAR FASHION, the code can be applied at /checkout. Never refer to internal phase numbers or roadmap phases.
- If asked about styling, outfit pairings, or colour coordination, reference VERIFIED_STYLE_GUIDES (/style-guide) and matching pieces from VERIFIED_STORE_CATALOG.
- If asked about Surprise Boxes / Mystery Boxes, quote only verified tiers, BDT prices, item counts, sizes, style preferences, included categories, and curation rules from VERIFIED_SURPRISE_BOXES (/surprise-box); never guarantee exact undisclosed items inside a mystery box.
- If asked about a feature marked "coming_soon" in VERIFIED_BRAND_EXPERIENCE_FEATURES, clearly state it is currently in Coming Soon preview at its listed page_url and not yet open for checkout.
- If asked a price budget (e.g., "under 2500" or "১০০০ টাকার মধ্যে"), strictly compare against price_bdt.
- Respond in Bangla ("bn") or English ("en") matching the customer's language.
- Include only exact product slugs from VERIFIED_STORE_CATALOG in recommended_slugs (0 to 4 items).
- If information is not in the verified context or Knowledge Base, state honestly that you do not have that confirmed policy/detail and set show_whatsapp_support to true.
- Return a valid JSON object with exact keys: { "reply": string, "language": "bn" | "en", "recommended_slugs": string[], "show_whatsapp_support": boolean }.`;
}

async function callGeminiProvider(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  storeContext: string;
  history: ChatTurn[];
  message: string;
}): Promise<GiridharAiOutput> {
  const ai = new GoogleGenAI({
    apiKey: params.apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: `STORE GROUNDING DATA (Authoritative Snapshot):\n${params.storeContext}` }],
    },
    {
      role: 'model' as const,
      parts: [
        {
          text: JSON.stringify({
            reply: 'Understood. I will answer strictly using the verified GIRIDHAR FASHION store, offers, membership, and Knowledge Base data.',
            language: 'en',
            recommended_slugs: [],
            show_whatsapp_support: false,
          }),
        },
      ],
    },
    ...params.history.slice(-12).map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: params.message }],
    },
  ];

  const response = await ai.models.generateContent({
    model: params.model,
    contents,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          language: { type: Type.STRING },
          recommended_slugs: { type: Type.ARRAY, items: { type: Type.STRING } },
          show_whatsapp_support: { type: Type.BOOLEAN },
        },
        required: ['reply', 'language', 'recommended_slugs', 'show_whatsapp_support'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) throw new Error('Empty response from Gemini.');
  const parsed = JSON.parse(rawText) as Partial<GiridharAiOutput>;

  return {
    reply: parsed.reply || 'How can I assist you with GIRIDHAR FASHION today?',
    language: parsed.language === 'bn' ? 'bn' : 'en',
    recommended_slugs: Array.isArray(parsed.recommended_slugs)
      ? parsed.recommended_slugs.filter((s): s is string => typeof s === 'string').slice(0, 4)
      : [],
    show_whatsapp_support: Boolean(parsed.show_whatsapp_support),
  };
}

async function callOpenAICompatibleProvider(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  storeContext: string;
  history: ChatTurn[];
  message: string;
}): Promise<GiridharAiOutput> {
  const endpoint = `${params.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const messages = [
    { role: 'system', content: params.systemInstruction },
    { role: 'system', content: `STORE GROUNDING DATA (Authoritative Snapshot):\n${params.storeContext}` },
    ...params.history.slice(-12).map((t) => ({
      role: t.role === 'model' ? 'assistant' : 'user',
      content: t.text,
    })),
    { role: 'user', content: params.message },
  ];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Provider HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty completion returned from AI provider.');
  }

  let parsed: Partial<GiridharAiOutput>;
  try {
    parsed = JSON.parse(content) as Partial<GiridharAiOutput>;
  } catch {
    // Graceful fallback if an OpenAI-compatible model returned plain prose
    return {
      reply: content,
      language: /[\u0980-\u09FF]/.test(content) ? 'bn' : 'en',
      recommended_slugs: [],
      show_whatsapp_support: false,
    };
  }

  return {
    reply: parsed.reply || 'How can I assist you with GIRIDHAR FASHION today?',
    language: parsed.language === 'bn' ? 'bn' : 'en',
    recommended_slugs: Array.isArray(parsed.recommended_slugs)
      ? parsed.recommended_slugs.filter((s): s is string => typeof s === 'string').slice(0, 4)
      : [],
    show_whatsapp_support: Boolean(parsed.show_whatsapp_support),
  };
}

async function invokeSingleProvider(params: {
  provider: AIProviderId;
  systemInstruction: string;
  storeContext: string;
  history: ChatTurn[];
  message: string;
}): Promise<GiridharAiOutput & { provider_used: AIProviderId; model_used: string }> {
  const creds = await resolveServerProviderCredentials(params.provider);
  if (!creds.is_enabled) {
    throw new AIProviderError(`Provider ${params.provider} is disabled.`, 503);
  }
  if (!creds.api_key) {
    throw new AIProviderError(`API key for ${params.provider} is not configured.`, 503);
  }

  if (params.provider === 'gemini') {
    const out = await callGeminiProvider({
      apiKey: creds.api_key,
      model: creds.selected_model,
      systemInstruction: params.systemInstruction,
      storeContext: params.storeContext,
      history: params.history,
      message: params.message,
    });
    return { ...out, provider_used: 'gemini', model_used: creds.selected_model };
  }

  const baseUrl =
    params.provider === 'openai'
      ? creds.custom_base_url || 'https://api.openai.com/v1'
      : creds.custom_base_url || '';

  if (!baseUrl) {
    throw new AIProviderError('Custom provider Base URL is not configured.', 503);
  }

  const out = await callOpenAICompatibleProvider({
    baseUrl,
    apiKey: creds.api_key,
    model: creds.selected_model,
    systemInstruction: params.systemInstruction,
    storeContext: params.storeContext,
    history: params.history,
    message: params.message,
  });
  return { ...out, provider_used: params.provider, model_used: creds.selected_model };
}

export async function generateGroundedAssistantReply(params: {
  message: string;
  history: ChatTurn[];
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  offers: Offer[];
  membership: MembershipConfig;
  settings: StoreSettings;
  aiSettings: AIAssistantSettings;
  retrievedKnowledge: RetrievedKnowledgeHit[];
  brandExperienceFeatures?: BrandExperienceFeature[];
  styleGuides?: StyleGuide[];
  surpriseBoxes?: SurpriseBox[];
}): Promise<GiridharAiOutput> {
  const storeContext = buildGroundedContext(params);
  const systemInstruction = buildSystemInstruction(params.aiSettings.system_instructions);

  const primary = params.aiSettings.active_provider || 'gemini';
  const fallback = params.aiSettings.fallback_provider;

  try {
    const res = await invokeSingleProvider({
      provider: primary,
      systemInstruction,
      storeContext,
      history: params.history,
      message: params.message,
    });
    return { ...res, used_fallback: false };
  } catch (primaryErr) {
    if (fallback && fallback !== primary) {
      try {
        const fbRes = await invokeSingleProvider({
          provider: fallback,
          systemInstruction,
          storeContext,
          history: params.history,
          message: params.message,
        });
        return { ...fbRes, used_fallback: true };
      } catch (fbErr) {
        const msg = fbErr instanceof Error ? fbErr.message : 'Fallback AI provider failed.';
        throw new AIProviderError(
          `Unable to reach ${primary} or fallback ${fallback} right now (${msg}). Please contact WhatsApp Support.`,
          503
        );
      }
    }

    if (primaryErr instanceof AIProviderError) {
      throw primaryErr;
    }
    const msg = primaryErr instanceof Error ? primaryErr.message : 'AI service error.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
      throw new AIProviderError(
        `The configured ${PROVIDER_DEFAULT_MODELS[primary].label} API key could not be verified. Please verify credentials in Admin -> AI Control Panel.`,
        503
      );
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new AIProviderError(
        'GIRIDHAR AI is experiencing high request volume right now. Please try again shortly or reach us on WhatsApp.',
        429
      );
    }
    throw new AIProviderError(
      'Unable to reach GIRIDHAR AI right now. Please try again or contact our WhatsApp concierge.',
      502
    );
  }
}

export async function testProviderConnection(input: {
  provider: AIProviderId;
  model?: string;
  api_key?: string;
  custom_base_url?: string | null;
}): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  const stored = await resolveServerProviderCredentials(input.provider);
  const effectiveKey =
    input.api_key && input.api_key !== '__CLEAR__' && input.api_key.trim().length > 0
      ? input.api_key.trim()
      : stored.api_key;
  const effectiveModel = input.model?.trim() || stored.selected_model;
  const effectiveBaseUrl =
    input.custom_base_url !== undefined ? input.custom_base_url : stored.custom_base_url;

  if (!effectiveKey) {
    const msg = `No API key configured for ${PROVIDER_DEFAULT_MODELS[input.provider].label}.`;
    await recordProviderTestResult(input.provider, 'error', msg).catch(() => {});
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }

  try {
    if (input.provider === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const res = await ai.models.generateContent({
        model: effectiveModel,
        contents: 'Reply with exact word READY.',
      });
      const text = (res.text ?? '').trim();
      const msg = `Connected to Google Gemini (${effectiveModel}) — ${text.slice(0, 40) || 'OK'}`;
      await recordProviderTestResult('gemini', 'ok', msg).catch(() => {});
      return { ok: true, message: msg, latencyMs: Date.now() - start };
    }

    const baseUrl =
      input.provider === 'openai'
        ? effectiveBaseUrl || 'https://api.openai.com/v1'
        : effectiveBaseUrl || '';

    if (!baseUrl) {
      const msg = 'Custom provider Base URL is required.';
      await recordProviderTestResult(input.provider, 'error', msg).catch(() => {});
      return { ok: false, message: msg, latencyMs: Date.now() - start };
    }

    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: [{ role: 'user', content: 'Reply with exact word READY.' }],
        max_tokens: 12,
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${errTxt.slice(0, 140)}`);
    }

    const msg = `Connected to ${PROVIDER_DEFAULT_MODELS[input.provider].label} (${effectiveModel})`;
    await recordProviderTestResult(input.provider, 'ok', msg).catch(() => {});
    return { ok: true, message: msg, latencyMs: Date.now() - start };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Connection failed.';
    const safeMsg = raw.replace(/(AIza[0-9A-Za-z_-]+|sk-[0-9A-Za-z_-]+)/g, '[REDACTED]');
    await recordProviderTestResult(input.provider, 'error', safeMsg).catch(() => {});
    return { ok: false, message: safeMsg, latencyMs: Date.now() - start };
  }
}
