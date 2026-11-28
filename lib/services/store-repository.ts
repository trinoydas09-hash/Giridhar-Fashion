import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { INITIAL_STORE_SNAPSHOT } from '@/lib/data/seed';
import { buildChunksForDocument, retrieveRelevantKnowledgeChunks } from '@/lib/ai/rag';
import { getPublicProviderConfigs } from '@/lib/security/secrets';
import { isOfferCurrentlyValid } from '@/lib/offers/engine';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ActivityEntry,
  AIAssistantSettings,
  AIUsageStats,
  BrandExperienceFeature,
  BrandExperienceFeatureKey,
  BrandExperienceStatus,
  Category,
  HomepageBanner,
  HomepageSectionConfig,
  KnowledgeChunk,
  KnowledgeDocument,
  MembershipCode,
  MembershipConfig,
  MembershipRecord,
  MembershipRecordStatus,
  MembershipRequest,
  MembershipRequestView,
  Offer,
  OrderRecord,
  Product,
  ProductImage,
  ProductVariant,
  Promotion,
  RetrievedKnowledgeHit,
  StoreSettings,
  StoreSnapshot,
  StyleGuide,
  SurpriseBox,
} from '@/types/store';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';

const DB_FILE_PATH = path.join('/tmp', 'giridhar-store-db.json');
const CHUNKS_FILE_PATH = path.join('/tmp', 'giridhar-knowledge-chunks.json');

declare global {
  var __giridharStoreCache: StoreSnapshot | undefined;
  var __giridharStoreCacheMtime: number | undefined;
  var __giridharChunksCache: KnowledgeChunk[] | undefined;
}

function normalizeSnapshot(parsed: StoreSnapshot): StoreSnapshot {
  const clone = structuredClone(INITIAL_STORE_SNAPSHOT);
  const existingSections = Array.isArray(parsed.sections) ? parsed.sections : clone.sections;
  const hasBrandExperienceSection = existingSections.some((s) => s.section_key === 'brand_experience');
  const mergedSections = hasBrandExperienceSection
    ? existingSections
    : [
        ...existingSections,
        ...clone.sections.filter((s) => s.section_key === 'brand_experience'),
      ].sort((a, b) => a.display_order - b.display_order);

  const existingOffers = Array.isArray(parsed.offers) ? parsed.offers : clone.offers;
  const isPreBrandExperienceSnapshot =
    !Array.isArray(parsed.brand_experience_features) || parsed.brand_experience_features.length === 0;
  const mergedOffers =
    isPreBrandExperienceSnapshot && !existingOffers.some((o) => o.id === 'offer-shirt-trouser-combo')
      ? [...clone.offers.filter((o) => o.id === 'offer-shirt-trouser-combo'), ...existingOffers]
      : existingOffers;

  return {
    ...clone,
    ...parsed,
    sections: mergedSections,
    offers: mergedOffers,
    membership: parsed.membership?.name ? parsed.membership : clone.membership,
    membership_requests: Array.isArray(parsed.membership_requests)
      ? parsed.membership_requests
      : [],
    membership_records: Array.isArray(parsed.membership_records)
      ? parsed.membership_records
      : [],
    membership_codes: Array.isArray(parsed.membership_codes) ? parsed.membership_codes : [],
    brand_experience_features:
      Array.isArray(parsed.brand_experience_features) && parsed.brand_experience_features.length > 0
        ? parsed.brand_experience_features
        : clone.brand_experience_features,
    style_guides: Array.isArray(parsed.style_guides) ? parsed.style_guides : clone.style_guides,
    surprise_boxes: Array.isArray(parsed.surprise_boxes) ? parsed.surprise_boxes : clone.surprise_boxes,
    ai_settings: parsed.ai_settings
      ? {
          ...clone.ai_settings!,
          ...parsed.ai_settings,
          faqs: Array.isArray(parsed.ai_settings.faqs) ? parsed.ai_settings.faqs : clone.ai_settings!.faqs,
        }
      : clone.ai_settings,
    ai_usage: parsed.ai_usage
      ? {
          total_messages: parsed.ai_usage.total_messages ?? 0,
          total_conversations: parsed.ai_usage.total_conversations ?? 0,
          bangla_messages: parsed.ai_usage.bangla_messages ?? 0,
          english_messages: parsed.ai_usage.english_messages ?? 0,
          last_used_at: parsed.ai_usage.last_used_at ?? null,
          recent_queries: Array.isArray(parsed.ai_usage.recent_queries) ? parsed.ai_usage.recent_queries : [],
        }
      : clone.ai_usage,
    knowledge_documents: Array.isArray(parsed.knowledge_documents)
      ? parsed.knowledge_documents
      : clone.knowledge_documents,
  };
}

function loadLocalStore(): StoreSnapshot {
  const exists = fs.existsSync(DB_FILE_PATH);
  if (globalThis.__giridharStoreCache && exists) {
    try {
      const mtime = fs.statSync(DB_FILE_PATH).mtimeMs;
      if (globalThis.__giridharStoreCacheMtime === mtime) {
        return globalThis.__giridharStoreCache;
      }
    } catch {
      return globalThis.__giridharStoreCache;
    }
  }

  try {
    if (exists) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const mtime = fs.statSync(DB_FILE_PATH).mtimeMs;
      const parsed = JSON.parse(raw) as StoreSnapshot;
      if (parsed && Array.isArray(parsed.products) && parsed.settings) {
        const normalized = normalizeSnapshot(parsed);
        globalThis.__giridharStoreCache = normalized;
        globalThis.__giridharStoreCacheMtime = mtime;
        return normalized;
      }
    }
  } catch {
    // Fallback to initial seed snapshot
  }

  const clone = structuredClone(INITIAL_STORE_SNAPSHOT);
  globalThis.__giridharStoreCache = clone;
  saveLocalStore(clone);
  return clone;
}

function saveLocalStore(snapshot: StoreSnapshot): void {
  globalThis.__giridharStoreCache = snapshot;
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
    globalThis.__giridharStoreCacheMtime = fs.statSync(DB_FILE_PATH).mtimeMs;
  } catch {
    // Ignore filesystem errors in read-only edge cases; global cache remains intact
  }
}

async function loadLocalChunks(docs: KnowledgeDocument[]): Promise<KnowledgeChunk[]> {
  if (globalThis.__giridharChunksCache) {
    return globalThis.__giridharChunksCache;
  }
  try {
    if (fs.existsSync(CHUNKS_FILE_PATH)) {
      const raw = fs.readFileSync(CHUNKS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as KnowledgeChunk[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__giridharChunksCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Rebuild from docs below
  }

  const rebuilt: KnowledgeChunk[] = [];
  for (const d of docs) {
    const { chunks } = await buildChunksForDocument({
      id: d.id,
      title: d.title,
      category: d.category,
      content: d.content,
    });
    rebuilt.push(...chunks);
  }
  saveLocalChunks(rebuilt);
  return rebuilt;
}

function saveLocalChunks(chunks: KnowledgeChunk[]): void {
  globalThis.__giridharChunksCache = chunks;
  try {
    fs.writeFileSync(CHUNKS_FILE_PATH, JSON.stringify(chunks), 'utf8');
  } catch {
    // Ignore write failure
  }
}

function recordActivity(snapshot: StoreSnapshot, action: string, entity_type: string, entity_name: string) {
  const entry: ActivityEntry = {
    id: `act-${crypto.randomUUID().slice(0, 8)}`,
    action,
    entity_type,
    entity_name,
    created_at: new Date().toISOString(),
  };
  snapshot.activity = [entry, ...snapshot.activity].slice(0, 30);
}

async function loadSupabaseSnapshot(
  includeDrafts: boolean,
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<StoreSnapshot> {
  const client = clientOverride ?? (includeDrafts
    ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
    : await createSupabaseServerClient());

  if (!client) {
    return loadLocalStore();
  }

  try {
    const [
      { data: categories },
      { data: products },
      { data: images },
      { data: variants },
      { data: banners },
      { data: sections },
      { data: promotions },
      { data: settingsRows },
    ] = await Promise.all([
      client.from('categories').select('*').order('display_order', { ascending: true }),
      client.from('products').select('*').order('created_at', { ascending: false }),
      client.from('product_images').select('*').order('display_order', { ascending: true }),
      client.from('product_variants').select('*').order('created_at', { ascending: true }),
      client.from('homepage_banners').select('*').order('display_order', { ascending: true }),
      client.from('homepage_sections').select('*').order('display_order', { ascending: true }),
      client.from('promotions').select('*').order('created_at', { ascending: false }),
      client.from('store_settings').select('*').limit(1),
    ]);

    // Optional tables from migration 004 / 005 / 006 with graceful seed fallback if not yet applied
    let offers: Offer[] = INITIAL_STORE_SNAPSHOT.offers;
    let membership: MembershipConfig = INITIAL_STORE_SNAPSHOT.membership;
    let knowledgeDocs: KnowledgeDocument[] = INITIAL_STORE_SNAPSHOT.knowledge_documents ?? [];
    let brandExperienceFeatures: BrandExperienceFeature[] =
      INITIAL_STORE_SNAPSHOT.brand_experience_features;
    let styleGuides: StyleGuide[] = INITIAL_STORE_SNAPSHOT.style_guides;
    let surpriseBoxes: SurpriseBox[] = INITIAL_STORE_SNAPSHOT.surprise_boxes;

    try {
      const [{ data: offerRows }, { data: memberRows }] = await Promise.all([
        client.from('offers').select('*').order('created_at', { ascending: false }),
        client.from('membership_settings').select('*').limit(1),
      ]);
      if (Array.isArray(offerRows)) {
        offers = offerRows as Offer[];
      }
      if (Array.isArray(memberRows) && memberRows[0]) {
        membership = memberRows[0] as MembershipConfig;
      }
    } catch {
      // Fallback to seed offers/membership until migration 005 is run
    }

    try {
      const [{ data: featureRows }, { data: guideRows }, { data: boxRows }] = await Promise.all([
        client.from('brand_experience_features').select('*').order('display_order', { ascending: true }),
        client.from('style_guides').select('*').order('display_order', { ascending: true }),
        client.from('surprise_boxes').select('*').order('display_order', { ascending: true }),
      ]);
      if (Array.isArray(featureRows) && featureRows.length > 0) {
        brandExperienceFeatures = featureRows as BrandExperienceFeature[];
      }
      if (Array.isArray(guideRows)) {
        styleGuides = guideRows as StyleGuide[];
      }
      if (Array.isArray(boxRows)) {
        surpriseBoxes = boxRows as SurpriseBox[];
      }
    } catch {
      // Fallback to seed brand experience data until migration 006 is run
    }

    let orders: OrderRecord[] = [];
    let membershipRequests: MembershipRequest[] = [];
    let membershipRecords: MembershipRecord[] = [];
    let membershipCodes: MembershipCode[] = [];
    if (includeDrafts) {
      const { data: orderRows } = await client
        .from('order_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      orders = (orderRows as OrderRecord[]) ?? [];

      try {
        const [{ data: kRows }, { data: reqRows }, { data: recRows }, { data: codeRows }] =
          await Promise.all([
            client.from('knowledge_documents').select('*').order('created_at', { ascending: false }),
            client.from('membership_requests').select('*').order('created_at', { ascending: false }),
            client.from('membership_records').select('*').order('created_at', { ascending: false }),
            client.from('membership_codes').select('*').order('created_at', { ascending: false }),
          ]);
        if (Array.isArray(kRows)) {
          knowledgeDocs = kRows as KnowledgeDocument[];
        }
        if (Array.isArray(reqRows)) {
          membershipRequests = reqRows as MembershipRequest[];
        }
        if (Array.isArray(recRows)) {
          membershipRecords = recRows as MembershipRecord[];
        }
        if (Array.isArray(codeRows)) {
          membershipCodes = codeRows as MembershipCode[];
        }
      } catch {
        // Ignore if migrations 005/007 not applied yet
      }
    }

    const catList = (categories as Category[]) ?? [];
    const catMap = new Map(catList.map((c) => [c.id, c]));
    const imgList = (images as ProductImage[]) ?? [];
    const varList = (variants as ProductVariant[]) ?? [];

    const enrichedProducts: Product[] = ((products as Product[]) ?? [])
      .filter((p) => (includeDrafts ? true : p.is_published))
      .map((p) => ({
        ...p,
        specifications: Array.isArray(p.specifications) ? p.specifications : [],
        category: catMap.get(p.category_id),
        images: imgList.filter((i) => i.product_id === p.id),
        variants: varList.filter((v) => v.product_id === p.id),
      }));

    return {
      categories: includeDrafts ? catList : catList.filter((c) => c.is_published),
      products: enrichedProducts,
      banners: includeDrafts
        ? ((banners as HomepageBanner[]) ?? [])
        : ((banners as HomepageBanner[]) ?? []).filter((b) => b.is_active),
      sections: (sections as HomepageSectionConfig[]) ?? INITIAL_STORE_SNAPSHOT.sections,
      promotions: includeDrafts
        ? ((promotions as Promotion[]) ?? [])
        : ((promotions as Promotion[]) ?? []).filter((p) => p.is_active),
      offers: includeDrafts ? offers : offers.filter((o) => isOfferCurrentlyValid(o)),
      membership,
      membership_requests: includeDrafts ? membershipRequests : undefined,
      membership_records: includeDrafts ? membershipRecords : undefined,
      membership_codes: includeDrafts ? membershipCodes : undefined,
      brand_experience_features: includeDrafts
        ? brandExperienceFeatures
        : brandExperienceFeatures.filter((f) => f.status !== 'disabled'),
      style_guides: includeDrafts ? styleGuides : styleGuides.filter((g) => g.is_published),
      surprise_boxes: includeDrafts ? surpriseBoxes : surpriseBoxes.filter((b) => b.is_active),
      settings: (settingsRows?.[0] as StoreSettings) ?? INITIAL_STORE_SNAPSHOT.settings,
      orders,
      subscribers: [],
      activity: INITIAL_STORE_SNAPSHOT.activity,
      knowledge_documents: includeDrafts ? knowledgeDocs : undefined,
    };
  } catch {
    return loadLocalStore();
  }
}

export async function getPublicStoreData(): Promise<{
  categories: Category[];
  products: Product[];
  banners: HomepageBanner[];
  sections: HomepageSectionConfig[];
  promotions: Promotion[];
  offers: Offer[];
  membership: MembershipConfig;
  brand_experience_features: BrandExperienceFeature[];
  style_guides: StyleGuide[];
  surprise_boxes: SurpriseBox[];
  settings: StoreSettings;
}> {
  if (isSupabaseConfigured()) {
    const snap = await loadSupabaseSnapshot(false);
    return {
      categories: snap.categories,
      products: snap.products,
      banners: snap.banners,
      sections: snap.sections
        .filter((s) => s.is_visible)
        .sort((a, b) => a.display_order - b.display_order),
      promotions: snap.promotions,
      offers: snap.offers.filter((o) => isOfferCurrentlyValid(o)),
      membership: snap.membership,
      brand_experience_features: (snap.brand_experience_features || [])
        .filter((f) => f.status !== 'disabled')
        .sort((a, b) => a.display_order - b.display_order),
      style_guides: (snap.style_guides || [])
        .filter((g) => g.is_published)
        .sort((a, b) => a.display_order - b.display_order),
      surprise_boxes: (snap.surprise_boxes || [])
        .filter((b) => b.is_active)
        .sort((a, b) => a.display_order - b.display_order),
      settings: snap.settings,
    };
  }

  const snap = loadLocalStore();
  const publishedCategories = snap.categories
    .filter((c) => c.is_published)
    .sort((a, b) => a.display_order - b.display_order);
  const catMap = new Map(snap.categories.map((c) => [c.id, c]));

  const publishedProducts = snap.products
    .filter((p) => p.is_published)
    .map((p) => ({
      ...p,
      category: catMap.get(p.category_id),
    }));

  const nowDate = new Date().toISOString().slice(0, 10);
  const activePromotions = snap.promotions.filter(
    (p) => p.is_active && (!p.end_date || p.end_date >= nowDate)
  );
  const activeOffers = (snap.offers || []).filter((o) => isOfferCurrentlyValid(o, nowDate));

  return {
    categories: publishedCategories,
    products: publishedProducts,
    banners: snap.banners.filter((b) => b.is_active).sort((a, b) => a.display_order - b.display_order),
    sections: snap.sections.filter((s) => s.is_visible).sort((a, b) => a.display_order - b.display_order),
    promotions: activePromotions,
    offers: activeOffers,
    membership: snap.membership,
    brand_experience_features: (snap.brand_experience_features || [])
      .filter((f) => f.status !== 'disabled')
      .sort((a, b) => a.display_order - b.display_order),
    style_guides: (snap.style_guides || [])
      .filter((g) => g.is_published)
      .sort((a, b) => a.display_order - b.display_order),
    surprise_boxes: (snap.surprise_boxes || [])
      .filter((b) => b.is_active)
      .sort((a, b) => a.display_order - b.display_order),
    settings: snap.settings,
  };
}

export async function getPublicProductBySlug(slug: string): Promise<{
  product: Product | null;
  related: Product[];
  offers: Offer[];
  styleGuides: StyleGuide[];
  matchingProducts: Product[];
  styleGuideEnabled: boolean;
  settings: StoreSettings;
}> {
  const pub = await getPublicStoreData();
  const product = pub.products.find((p) => p.slug === slug) ?? null;
  const styleGuideFeature = pub.brand_experience_features.find((f) => f.feature_key === 'style_guide');
  const styleGuideEnabled = Boolean(styleGuideFeature && styleGuideFeature.status === 'enabled');

  if (!product) {
    return {
      product: null,
      related: [],
      offers: pub.offers,
      styleGuides: [],
      matchingProducts: [],
      styleGuideEnabled,
      settings: pub.settings,
    };
  }

  const related = pub.products
    .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.is_featured))
    .slice(0, 4);

  const productStyleGuides = styleGuideEnabled
    ? pub.style_guides.filter((g) => g.connected_product_ids.includes(product.id))
    : [];

  const matchingIdSet = new Set<string>();
  for (const guide of productStyleGuides) {
    for (const pid of guide.matching_product_ids) {
      if (pid !== product.id) matchingIdSet.add(pid);
    }
  }
  const matchingProducts = pub.products.filter((p) => matchingIdSet.has(p.id));

  return {
    product,
    related,
    offers: pub.offers,
    styleGuides: productStyleGuides,
    matchingProducts,
    styleGuideEnabled,
    settings: pub.settings,
  };
}

export async function getAdminStoreSnapshot(
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<StoreSnapshot> {
  const aiProviders = await getPublicProviderConfigs();
  const aiSettings = await getAIAssistantSettings();

  if (isSupabaseConfigured()) {
    const snap = await loadSupabaseSnapshot(true, clientOverride);
    return {
      ...snap,
      ai_settings: snap.ai_settings || aiSettings,
      ai_providers: aiProviders,
    };
  }

  const snap = loadLocalStore();
  const catMap = new Map(snap.categories.map((c) => [c.id, c]));
  return {
    ...snap,
    products: snap.products.map((p) => ({
      ...p,
      category: catMap.get(p.category_id),
    })),
    ai_settings: aiSettings,
    ai_providers: aiProviders,
  };
}

// ============================================================================
// PRODUCT MUTATIONS
// ============================================================================

export async function upsertProduct(
  input: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<Product> {
  const now = new Date().toISOString();
  const productId = input.id || `prod-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = clientOverride ?? createSupabaseAdminClient();
    if (!admin) throw new Error('Admin database client unavailable. Please sign in again and retry.');

    const { data: productRow, error: prodErr } = await admin.from('products').upsert({
      id: productId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      short_description: input.short_description,
      price: input.price,
      compare_at_price: input.compare_at_price,
      category_id: input.category_id,
      is_published: input.is_published,
      is_featured: input.is_featured,
      is_best_seller: input.is_best_seller,
      is_new_arrival: input.is_new_arrival,
      specifications: input.specifications,
      updated_at: now,
    }).select().single();
    if (prodErr || !productRow) throw new Error(prodErr?.message || 'Product could not be saved.');

    const { error: imageDeleteErr } = await admin.from('product_images').delete().eq('product_id', productId);
    if (imageDeleteErr) throw new Error(imageDeleteErr.message);
    const imageRows = input.images.map((img, i) => ({
      id: !img.id || img.id.startsWith('img-new') ? `img-${crypto.randomUUID().slice(0, 8)}` : img.id,
      product_id: productId,
      url: img.url,
      alt_text: img.alt_text || input.name,
      colour: img.colour || null,
      display_order: i + 1,
      is_primary: i === 0 ? true : img.is_primary,
    }));
    if (imageRows.length > 0) {
      const { error: imgErr } = await admin.from('product_images').insert(imageRows);
      if (imgErr) throw new Error(imgErr.message);
    }

    const { error: variantDeleteErr } = await admin.from('product_variants').delete().eq('product_id', productId);
    if (variantDeleteErr) throw new Error(variantDeleteErr.message);
    const variantRows = input.variants.map((v) => ({
      id: !v.id || v.id.startsWith('var-new') ? `var-${crypto.randomUUID().slice(0, 8)}` : v.id,
      product_id: productId,
      colour: v.colour,
      colour_hex: v.colour_hex,
      size: v.size,
      sku: v.sku,
      stock_status: v.stock_status,
      stock_quantity: v.stock_quantity,
    }));
    if (variantRows.length > 0) {
      const { error: varErr } = await admin.from('product_variants').insert(variantRows);
      if (varErr) throw new Error(varErr.message);
    }

    return {
      ...(productRow as Product),
      category: undefined,
      specifications: Array.isArray(productRow.specifications) ? productRow.specifications : [],
      images: imageRows,
      variants: variantRows,
    } as Product;
  }

  const snap = loadLocalStore();
  const existingIdx = snap.products.findIndex((p) => p.id === productId);
  const saved: Product = {
    ...input,
    id: productId,
    images: input.images.map((img, i) => ({
      ...img,
      id: img.id || `img-${crypto.randomUUID().slice(0, 8)}`,
      product_id: productId,
      display_order: i + 1,
      is_primary: i === 0,
    })),
    variants: input.variants.map((v) => ({
      ...v,
      id: v.id || `var-${crypto.randomUUID().slice(0, 8)}`,
      product_id: productId,
      created_at: v.created_at || now,
    })),
    created_at: existingIdx >= 0 ? snap.products[existingIdx].created_at : now,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    snap.products[existingIdx] = saved;
    recordActivity(snap, 'Updated product', 'product', saved.name);
  } else {
    snap.products.unshift(saved);
    recordActivity(snap, 'Created product', 'product', saved.name);
  }

  saveLocalStore(snap);
  return saved;
}

export async function deleteProduct(
  id: string,
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = clientOverride ?? createSupabaseAdminClient();
    if (!admin) throw new Error('Admin database client unavailable. Please sign in again and retry.');
    const { error } = await admin.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const target = snap.products.find((p) => p.id === id);
  snap.products = snap.products.filter((p) => p.id !== id);
  if (target) recordActivity(snap, 'Deleted product', 'product', target.name);
  saveLocalStore(snap);
}

// ============================================================================
// CATEGORY MUTATIONS
// ============================================================================

export async function upsertCategory(
  input: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Category> {
  const now = new Date().toISOString();
  const catId = input.id || `cat-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('categories')
      .upsert({
        id: catId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        image_url: input.image_url,
        display_order: input.display_order,
        is_published: input.is_published,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Category;
  }

  const snap = loadLocalStore();
  const idx = snap.categories.findIndex((c) => c.id === catId);
  const saved: Category = {
    ...input,
    id: catId,
    created_at: idx >= 0 ? snap.categories[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) {
    snap.categories[idx] = saved;
    recordActivity(snap, 'Updated category', 'category', saved.name);
  } else {
    snap.categories.push(saved);
    recordActivity(snap, 'Created category', 'category', saved.name);
  }
  snap.categories.sort((a, b) => a.display_order - b.display_order);
  saveLocalStore(snap);
  return saved;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const target = snap.categories.find((c) => c.id === id);
  snap.categories = snap.categories.filter((c) => c.id !== id);
  if (target) recordActivity(snap, 'Deleted category', 'category', target.name);
  saveLocalStore(snap);
}

// ============================================================================
// HOMEPAGE BANNERS & SECTIONS
// ============================================================================

export async function upsertBanner(
  input: Omit<HomepageBanner, 'id' | 'created_at'> & { id?: string }
): Promise<HomepageBanner> {
  const now = new Date().toISOString();
  const id = input.id || `ban-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin.from('homepage_banners').upsert({ ...input, id }).select().single();
    if (error) throw new Error(error.message);
    return data as HomepageBanner;
  }

  const snap = loadLocalStore();
  const idx = snap.banners.findIndex((b) => b.id === id);
  const saved: HomepageBanner = {
    ...input,
    id,
    created_at: idx >= 0 ? snap.banners[idx].created_at : now,
  };
  if (idx >= 0) {
    snap.banners[idx] = saved;
    recordActivity(snap, 'Updated homepage banner', 'banner', saved.title);
  } else {
    snap.banners.push(saved);
    recordActivity(snap, 'Created homepage banner', 'banner', saved.title);
  }
  saveLocalStore(snap);
  return saved;
}

export async function deleteBanner(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('homepage_banners').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  snap.banners = snap.banners.filter((b) => b.id !== id);
  recordActivity(snap, 'Removed homepage banner', 'banner', id);
  saveLocalStore(snap);
}

export async function saveHomepageSections(sections: HomepageSectionConfig[]): Promise<HomepageSectionConfig[]> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('homepage_sections').upsert(sections);
    if (error) throw new Error(error.message);
    return sections;
  }

  const snap = loadLocalStore();
  snap.sections = [...sections].sort((a, b) => a.display_order - b.display_order);
  recordActivity(snap, 'Updated homepage layout order', 'homepage', `${sections.length} sections`);
  saveLocalStore(snap);
  return snap.sections;
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function upsertPromotion(
  input: Omit<Promotion, 'id' | 'created_at'> & { id?: string }
): Promise<Promotion> {
  const now = new Date().toISOString();
  const id = input.id || `promo-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin.from('promotions').upsert({ ...input, id }).select().single();
    if (error) throw new Error(error.message);
    return data as Promotion;
  }

  const snap = loadLocalStore();
  const idx = snap.promotions.findIndex((p) => p.id === id);
  const saved: Promotion = {
    ...input,
    id,
    created_at: idx >= 0 ? snap.promotions[idx].created_at : now,
  };
  if (idx >= 0) {
    snap.promotions[idx] = saved;
    recordActivity(snap, 'Updated promotion', 'promotion', saved.title);
  } else {
    snap.promotions.unshift(saved);
    recordActivity(snap, 'Created promotion', 'promotion', saved.title);
  }
  saveLocalStore(snap);
  return saved;
}

export async function deletePromotion(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('promotions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  snap.promotions = snap.promotions.filter((p) => p.id !== id);
  recordActivity(snap, 'Deleted promotion', 'promotion', id);
  saveLocalStore(snap);
}

// ============================================================================
// ADVANCED OFFERS & COMBOS
// ============================================================================

export async function upsertOffer(
  input: Omit<Offer, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Offer> {
  const now = new Date().toISOString();
  const id = input.id || `offer-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('offers')
      .upsert({
        ...input,
        id,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Offer;
  }

  const snap = loadLocalStore();
  const idx = snap.offers.findIndex((o) => o.id === id);
  const saved: Offer = {
    ...input,
    id,
    created_at: idx >= 0 ? snap.offers[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) {
    snap.offers[idx] = saved;
    recordActivity(snap, 'Updated promotional offer', 'offer', saved.name);
  } else {
    snap.offers.unshift(saved);
    recordActivity(snap, 'Created promotional offer', 'offer', saved.name);
  }
  saveLocalStore(snap);
  return saved;
}

export async function deleteOffer(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('offers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const target = snap.offers.find((o) => o.id === id);
  snap.offers = snap.offers.filter((o) => o.id !== id);
  recordActivity(snap, 'Deleted promotional offer', 'offer', target?.name || id);
  saveLocalStore(snap);
}

// ============================================================================
// PREMIUM MEMBERSHIP CONFIGURATION
// ============================================================================

export async function updateMembershipConfig(input: MembershipConfig): Promise<MembershipConfig> {
  const now = new Date().toISOString();
  const merged: MembershipConfig = {
    ...input,
    id: input.id || 'default-membership',
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('membership_settings')
      .upsert(merged)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as MembershipConfig;
  }

  const snap = loadLocalStore();
  snap.membership = merged;
  recordActivity(snap, 'Updated membership configuration', 'membership', merged.name);
  saveLocalStore(snap);
  return merged;
}

// ============================================================================
// VIP MEMBERSHIP REQUESTS, RECORDS & SERVER-SIDE CODE VALIDATION
// ============================================================================

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateUniqueVipCodeString(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 24; attempt++) {
    const bytes = crypto.randomBytes(6);
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    const candidate = `GF-${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `GF-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;
}

function buildJoinedMembershipViews(
  requests: MembershipRequest[],
  records: MembershipRecord[],
  codes: MembershipCode[]
): MembershipRequestView[] {
  const nowMs = Date.now();
  const recordByReqId = new Map(records.map((r) => [r.request_id, r]));
  const codeByReqId = new Map(codes.map((c) => [c.request_id, c]));

  return [...requests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((req) => {
      const rec = recordByReqId.get(req.id);
      const codeObj = codeByReqId.get(req.id);

      let derivedStatus: MembershipRecordStatus = rec?.membership_status || 'inactive';
      if (
        derivedStatus === 'active' &&
        rec?.expires_at &&
        new Date(rec.expires_at).getTime() <= nowMs
      ) {
        derivedStatus = 'expired';
      }

      const effectiveActive =
        req.request_status === 'approved' &&
        derivedStatus === 'active' &&
        Boolean(codeObj?.is_active);

      return {
        id: req.id,
        request_code: req.request_code,
        customer_name: rec?.customer_name ?? req.customer_name,
        whatsapp_number: rec?.whatsapp_number ?? req.whatsapp_number,
        membership_fee: rec?.membership_fee ?? req.membership_fee,
        discount_percentage: rec?.discount_percentage ?? req.discount_percentage,
        request_status: req.request_status,
        membership_record_id: rec?.id ?? null,
        membership_code: codeObj?.code ?? req.request_code,
        membership_status: derivedStatus,
        is_code_active: effectiveActive,
        activated_at: rec?.activated_at ?? codeObj?.activated_at ?? null,
        expires_at: rec?.expires_at ?? codeObj?.expires_at ?? null,
        approved_by: rec?.approved_by ?? req.reviewed_by ?? null,
        approved_at: rec?.approved_at ?? req.reviewed_at ?? null,
        notes: req.notes ?? null,
        created_at: req.created_at,
        updated_at: req.updated_at,
      };
    });
}

export async function listMembershipRequestViews(): Promise<MembershipRequestView[]> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for membership administration.');
    if (admin) {
      try {
        const [{ data: reqRows }, { data: recRows }, { data: codeRows }] = await Promise.all([
          admin.from('membership_requests').select('*').order('created_at', { ascending: false }),
          admin.from('membership_records').select('*'),
          admin.from('membership_codes').select('*'),
        ]);
        if (Array.isArray(reqRows)) {
          return buildJoinedMembershipViews(
            reqRows as MembershipRequest[],
            (recRows as MembershipRecord[]) || [],
            (codeRows as MembershipCode[]) || []
          );
        }
      } catch {
        // Fallback to local store if migration 007 not applied yet
      }
    }
  }

  const snap = loadLocalStore();
  return buildJoinedMembershipViews(
    snap.membership_requests || [],
    snap.membership_records || [],
    snap.membership_codes || []
  );
}

export async function createMembershipRequest(input: {
  customerName?: string;
  whatsappNumber?: string;
}): Promise<{
  request: MembershipRequest;
  requestCode: string;
  whatsappMessage: string;
  whatsappUrl: string;
}> {
  const pub = await getPublicStoreData();
  const membershipCfg = pub.membership;
  const settings = pub.settings;
  const now = new Date().toISOString();
  const reqId = `mreq-${crypto.randomUUID().slice(0, 8)}`;
  const codeId = `mcode-${crypto.randomUUID().slice(0, 8)}`;

  const cleanName = input.customerName?.trim() || null;
  const cleanPhone = input.whatsappNumber?.trim() || null;

  let existingCodeSet = new Set<string>();

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to save membership requests.');
    if (admin) {
      try {
        const { data: existingCodes } = await admin.from('membership_codes').select('code');
        existingCodeSet = new Set(
          ((existingCodes as { code: string }[]) || []).map((c) => c.code.toUpperCase())
        );
      } catch {
        // Ignore if table missing
      }
    }
  } else {
    const snap = loadLocalStore();
    existingCodeSet = new Set([
      ...(snap.membership_requests || []).map((r) => r.request_code.toUpperCase()),
      ...(snap.membership_codes || []).map((c) => c.code.toUpperCase()),
    ]);
  }

  const requestCode = generateUniqueVipCodeString(existingCodeSet);

  const requestRow: MembershipRequest = {
    id: reqId,
    request_code: requestCode,
    customer_name: cleanName,
    whatsapp_number: cleanPhone,
    membership_fee: Number(membershipCfg.price_bdt) || 59,
    discount_percentage: Number(membershipCfg.discount_percentage) || 20,
    request_status: 'pending',
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  };

  const codeRow: MembershipCode = {
    id: codeId,
    code: requestCode,
    request_id: reqId,
    membership_record_id: null,
    is_active: false, // Never active until Admin manually confirms payment & approves
    activated_at: null,
    expires_at: null,
    created_at: now,
    updated_at: now,
  };

  let savedToSupabase = false;
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const { error: reqErr } = await admin.from('membership_requests').insert(requestRow);
        if (!reqErr) {
          await admin.from('membership_codes').insert(codeRow);
          savedToSupabase = true;
        }
      } catch {
        // Fallback to local store if migration 007 not applied yet
      }
    }
  }

  if (!savedToSupabase) {
    const snap = loadLocalStore();
    snap.membership_requests = [requestRow, ...(snap.membership_requests || [])];
    snap.membership_codes = [codeRow, ...(snap.membership_codes || [])];
    recordActivity(
      snap,
      'VIP Membership request created (Pending)',
      'membership_request',
      `${requestCode}${cleanName ? ` · ${cleanName}` : ''}`
    );
    saveLocalStore(snap);
  }

  const feeDisplay = `${settings.currency_symbol}${requestRow.membership_fee}/${membershipCfg.billing_period_label}`;
  let whatsappMessage = (membershipCfg.whatsapp_message_template || '').trim();
  if (whatsappMessage.includes('{{REQUEST_CODE}}')) {
    whatsappMessage = whatsappMessage.replace(/\{\{REQUEST_CODE\}\}/g, requestCode);
  } else {
    whatsappMessage = [
      `Hello ${settings.brand_name}!`,
      '',
      'I want to purchase the VIP Membership.',
      '',
      `Membership Fee: ${feeDisplay}`,
      `Membership Benefit: ${requestRow.discount_percentage}% OFF`,
      `Membership Request Code: ${requestCode}`,
      ...(cleanName ? [`Name: ${cleanName}`] : []),
      ...(cleanPhone ? [`WhatsApp: ${cleanPhone}`] : []),
      '',
      'Please provide the payment details and activate my membership.',
    ].join('\n');
  }

  if (cleanName && !whatsappMessage.includes(cleanName)) {
    whatsappMessage += `\n\nName: ${cleanName}`;
  }
  if (cleanPhone && !whatsappMessage.includes(cleanPhone)) {
    whatsappMessage += `\nWhatsApp: ${cleanPhone}`;
  }

  const sanitizedWa = sanitizeWhatsAppNumber(settings.whatsapp_number);
  const whatsappUrl = sanitizedWa
    ? `https://wa.me/${sanitizedWa}?text=${encodeURIComponent(whatsappMessage)}`
    : '';

  return {
    request: requestRow,
    requestCode,
    whatsappMessage,
    whatsappUrl,
  };
}

export async function adminProcessMembershipRequest(input: {
  requestId: string;
  action: 'approve' | 'reject' | 'activate' | 'deactivate';
  customerName?: string;
  whatsappNumber?: string;
  notes?: string;
  adminEmail: string;
}): Promise<MembershipRequestView> {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const oneYearLater = new Date(nowDate);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const defaultExpiry = oneYearLater.toISOString();

  const applyMutation = (
    req: MembershipRequest,
    existingRecord: MembershipRecord | undefined,
    existingCode: MembershipCode | undefined
  ) => {
    const nextName =
      input.customerName !== undefined ? input.customerName.trim() || null : req.customer_name;
    const nextPhone =
      input.whatsappNumber !== undefined
        ? input.whatsappNumber.trim() || null
        : req.whatsapp_number;
    const nextNotes = input.notes !== undefined ? input.notes.trim() || null : req.notes;

    const updatedReq: MembershipRequest = {
      ...req,
      customer_name: nextName,
      whatsapp_number: nextPhone,
      notes: nextNotes,
      updated_at: now,
    };

    let nextRecord = existingRecord;
    let nextCode = existingCode;

    if (input.action === 'approve') {
      updatedReq.request_status = 'approved';
      updatedReq.reviewed_by = input.adminEmail;
      updatedReq.reviewed_at = now;

      const recId = existingRecord?.id || `mrec-${crypto.randomUUID().slice(0, 8)}`;
      const activatedAt = now;
      const expiresAt = defaultExpiry;

      nextRecord = {
        id: recId,
        request_id: req.id,
        customer_name: nextName,
        whatsapp_number: nextPhone,
        membership_status: 'active',
        membership_fee: req.membership_fee,
        discount_percentage: req.discount_percentage,
        activated_at: activatedAt,
        expires_at: expiresAt,
        approved_by: input.adminEmail,
        approved_at: now,
        created_at: existingRecord?.created_at || now,
        updated_at: now,
      };

      nextCode = {
        id: existingCode?.id || `mcode-${crypto.randomUUID().slice(0, 8)}`,
        code: existingCode?.code || req.request_code,
        request_id: req.id,
        membership_record_id: recId,
        is_active: true,
        activated_at: activatedAt,
        expires_at: expiresAt,
        created_at: existingCode?.created_at || now,
        updated_at: now,
      };
    } else if (input.action === 'reject') {
      updatedReq.request_status = 'rejected';
      updatedReq.reviewed_by = input.adminEmail;
      updatedReq.reviewed_at = now;

      if (existingRecord) {
        nextRecord = {
          ...existingRecord,
          customer_name: nextName,
          whatsapp_number: nextPhone,
          membership_status: 'inactive',
          updated_at: now,
        };
      }
      if (existingCode) {
        nextCode = {
          ...existingCode,
          is_active: false,
          updated_at: now,
        };
      }
    } else if (input.action === 'activate') {
      if (req.request_status !== 'approved' || !existingRecord) {
        throw new Error('Only approved membership requests can be activated.');
      }
      const isExpiredOrMissing =
        !existingRecord.expires_at ||
        new Date(existingRecord.expires_at).getTime() <= nowDate.getTime();
      const activatedAt = existingRecord.activated_at || now;
      const expiresAt = isExpiredOrMissing ? defaultExpiry : existingRecord.expires_at;

      nextRecord = {
        ...existingRecord,
        customer_name: nextName,
        whatsapp_number: nextPhone,
        membership_status: 'active',
        activated_at: activatedAt,
        expires_at: expiresAt,
        updated_at: now,
      };
      nextCode = existingCode
        ? {
            ...existingCode,
            membership_record_id: nextRecord.id,
            is_active: true,
            activated_at: activatedAt,
            expires_at: expiresAt,
            updated_at: now,
          }
        : {
            id: `mcode-${crypto.randomUUID().slice(0, 8)}`,
            code: req.request_code,
            request_id: req.id,
            membership_record_id: nextRecord.id,
            is_active: true,
            activated_at: activatedAt,
            expires_at: expiresAt,
            created_at: now,
            updated_at: now,
          };
    } else if (input.action === 'deactivate') {
      if (req.request_status !== 'approved' || !existingRecord) {
        throw new Error('Only approved membership records can be deactivated.');
      }
      nextRecord = {
        ...existingRecord,
        customer_name: nextName,
        whatsapp_number: nextPhone,
        membership_status: 'inactive',
        updated_at: now,
      };
      if (existingCode) {
        nextCode = {
          ...existingCode,
          is_active: false,
          updated_at: now,
        };
      }
    }

    return { updatedReq, nextRecord, nextCode };
  };

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to process membership requests.');
    if (admin) {
      const { data: reqRow, error: reqErr } = await admin
        .from('membership_requests')
        .select('*')
        .eq('id', input.requestId)
        .maybeSingle();

      if (!reqErr && reqRow) {
        const [{ data: recRow }, { data: codeRow }] = await Promise.all([
          admin
            .from('membership_records')
            .select('*')
            .eq('request_id', input.requestId)
            .maybeSingle(),
          admin
            .from('membership_codes')
            .select('*')
            .eq('request_id', input.requestId)
            .maybeSingle(),
        ]);

        const { updatedReq, nextRecord, nextCode } = applyMutation(
          reqRow as MembershipRequest,
          (recRow as MembershipRecord) || undefined,
          (codeRow as MembershipCode) || undefined
        );

        const { error: uErr } = await admin.from('membership_requests').upsert(updatedReq);
        if (uErr) throw new Error(uErr.message);

        if (nextRecord) {
          const { error: rErr } = await admin.from('membership_records').upsert(nextRecord);
          if (rErr) throw new Error(rErr.message);
        }
        if (nextCode) {
          const { error: cErr } = await admin.from('membership_codes').upsert(nextCode);
          if (cErr) throw new Error(cErr.message);
        }

        const views = buildJoinedMembershipViews(
          [updatedReq],
          nextRecord ? [nextRecord] : [],
          nextCode ? [nextCode] : []
        );
        return views[0];
      }
    }
  }

  const snap = loadLocalStore();
  const requests = snap.membership_requests || [];
  const records = snap.membership_records || [];
  const codes = snap.membership_codes || [];

  const reqIdx = requests.findIndex((r) => r.id === input.requestId);
  if (reqIdx < 0) {
    throw new Error('Membership request not found.');
  }

  const existingReq = requests[reqIdx];
  const recIdx = records.findIndex((r) => r.request_id === existingReq.id);
  const codeIdx = codes.findIndex((c) => c.request_id === existingReq.id);

  const { updatedReq, nextRecord, nextCode } = applyMutation(
    existingReq,
    recIdx >= 0 ? records[recIdx] : undefined,
    codeIdx >= 0 ? codes[codeIdx] : undefined
  );

  requests[reqIdx] = updatedReq;
  if (nextRecord) {
    if (recIdx >= 0) records[recIdx] = nextRecord;
    else records.unshift(nextRecord);
  }
  if (nextCode) {
    if (codeIdx >= 0) codes[codeIdx] = nextCode;
    else codes.unshift(nextCode);
  }

  snap.membership_requests = requests;
  snap.membership_records = records;
  snap.membership_codes = codes;

  recordActivity(
    snap,
    `VIP Membership ${input.action}`,
    'membership_request',
    `${updatedReq.request_code}${updatedReq.customer_name ? ` · ${updatedReq.customer_name}` : ''}`
  );
  saveLocalStore(snap);

  return buildJoinedMembershipViews(
    [updatedReq],
    nextRecord ? [nextRecord] : [],
    nextCode ? [nextCode] : []
  )[0];
}

export interface MembershipValidationResult {
  valid: boolean;
  status: 'active' | 'pending' | 'rejected' | 'inactive' | 'expired' | 'invalid';
  code: string;
  discountPercentage: number;
  activatedAt: string | null;
  expiresAt: string | null;
  error?: string;
}

export async function validateMembershipCode(rawCode: string): Promise<MembershipValidationResult> {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized || normalized.length < 5 || !/^[A-Z0-9-]+$/.test(normalized)) {
    return {
      valid: false,
      status: 'invalid',
      code: normalized,
      discountPercentage: 0,
      activatedAt: null,
      expiresAt: null,
      error: 'Please enter a valid VIP Membership Code (e.g. GF-XXXXXX).',
    };
  }

  let matchedReq: MembershipRequest | undefined;
  let matchedRecord: MembershipRecord | undefined;
  let matchedCodeObj: MembershipCode | undefined;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to validate membership codes.');
    if (admin) {
      try {
        const { data: codeRow } = await admin
          .from('membership_codes')
          .select('*')
          .eq('code', normalized)
          .maybeSingle();

        if (codeRow) {
          matchedCodeObj = codeRow as MembershipCode;
          const [{ data: reqRow }, { data: recRow }] = await Promise.all([
            admin
              .from('membership_requests')
              .select('*')
              .eq('id', matchedCodeObj.request_id)
              .maybeSingle(),
            matchedCodeObj.membership_record_id
              ? admin
                  .from('membership_records')
                  .select('*')
                  .eq('id', matchedCodeObj.membership_record_id)
                  .maybeSingle()
              : admin
                  .from('membership_records')
                  .select('*')
                  .eq('request_id', matchedCodeObj.request_id)
                  .maybeSingle(),
          ]);
          matchedReq = (reqRow as MembershipRequest) || undefined;
          matchedRecord = (recRow as MembershipRecord) || undefined;
        } else {
          const { data: reqByCode } = await admin
            .from('membership_requests')
            .select('*')
            .eq('request_code', normalized)
            .maybeSingle();
          matchedReq = (reqByCode as MembershipRequest) || undefined;
        }
      } catch {
        // Fallback to local store
      }
    }
  }

  if (!matchedCodeObj && !matchedReq) {
    const snap = loadLocalStore();
    matchedCodeObj = (snap.membership_codes || []).find(
      (c) => c.code.toUpperCase() === normalized
    );
    if (matchedCodeObj) {
      matchedReq = (snap.membership_requests || []).find(
        (r) => r.id === matchedCodeObj!.request_id
      );
      matchedRecord = (snap.membership_records || []).find(
        (rec) =>
          rec.id === matchedCodeObj!.membership_record_id ||
          rec.request_id === matchedCodeObj!.request_id
      );
    } else {
      matchedReq = (snap.membership_requests || []).find(
        (r) => r.request_code.toUpperCase() === normalized
      );
      if (matchedReq) {
        matchedRecord = (snap.membership_records || []).find(
          (rec) => rec.request_id === matchedReq!.id
        );
      }
    }
  }

  if (!matchedReq && !matchedCodeObj) {
    return {
      valid: false,
      status: 'invalid',
      code: normalized,
      discountPercentage: 0,
      activatedAt: null,
      expiresAt: null,
      error: 'This VIP Membership Code was not found. Please check the code and try again.',
    };
  }

  if (matchedReq?.request_status === 'pending') {
    return {
      valid: false,
      status: 'pending',
      code: normalized,
      discountPercentage: 0,
      activatedAt: null,
      expiresAt: null,
      error:
        'This Membership Request Code is still pending payment confirmation and activation by GIRIDHAR FASHION.',
    };
  }

  if (matchedReq?.request_status === 'rejected') {
    return {
      valid: false,
      status: 'rejected',
      code: normalized,
      discountPercentage: 0,
      activatedAt: null,
      expiresAt: null,
      error: 'This membership request was rejected and is not eligible for member discounts.',
    };
  }

  const effectiveCodeActive = Boolean(matchedCodeObj ? matchedCodeObj.is_active : true);
  if (!matchedRecord || matchedRecord.membership_status === 'inactive' || !effectiveCodeActive) {
    return {
      valid: false,
      status: 'inactive',
      code: normalized,
      discountPercentage: 0,
      activatedAt: matchedRecord?.activated_at ?? null,
      expiresAt: matchedRecord?.expires_at ?? null,
      error:
        'This VIP Membership Code is currently inactive. Please contact GIRIDHAR FASHION via WhatsApp.',
    };
  }

  const expiry = matchedRecord.expires_at || matchedCodeObj?.expires_at || null;
  if (
    matchedRecord.membership_status === 'expired' ||
    (expiry && new Date(expiry).getTime() <= Date.now())
  ) {
    return {
      valid: false,
      status: 'expired',
      code: normalized,
      discountPercentage: 0,
      activatedAt: matchedRecord.activated_at ?? null,
      expiresAt: expiry,
      error: 'This VIP Membership Code has expired. Please renew your annual membership via WhatsApp.',
    };
  }

  const pub = await getPublicStoreData();
  const discountPct =
    Number(matchedRecord.discount_percentage) ||
    Number(pub.membership.discount_percentage) ||
    20;

  return {
    valid: true,
    status: 'active',
    code: normalized,
    discountPercentage: discountPct,
    activatedAt: matchedRecord.activated_at ?? matchedCodeObj?.activated_at ?? null,
    expiresAt: expiry,
  };
}

// ============================================================================
// BRAND EXPERIENCE FEATURES, STYLE GUIDES & SURPRISE BOXES
// ============================================================================

export async function updateBrandExperienceFeature(input: {
  feature_key: BrandExperienceFeatureKey;
  status: BrandExperienceStatus;
  display_order?: number;
  description?: string;
}): Promise<BrandExperienceFeature[]> {
  const now = new Date().toISOString();
  const is_enabled = input.status === 'enabled';
  const is_coming_soon = input.status === 'coming_soon';

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const seedFallback = INITIAL_STORE_SNAPSHOT.brand_experience_features.find(
      (f) => f.feature_key === input.feature_key
    );
    const updatePayload: Record<string, unknown> = {
      status: input.status,
      is_enabled,
      is_coming_soon,
      updated_at: now,
    };
    if (typeof input.display_order === 'number') updatePayload.display_order = input.display_order;
    if (typeof input.description === 'string') updatePayload.description = input.description;

    const { error } = await admin
      .from('brand_experience_features')
      .update(updatePayload)
      .eq('feature_key', input.feature_key);
    if (error && seedFallback) {
      await admin.from('brand_experience_features').upsert({
        ...seedFallback,
        ...updatePayload,
      });
    }
    const { data: allRows } = await admin
      .from('brand_experience_features')
      .select('*')
      .order('display_order', { ascending: true });
    if (Array.isArray(allRows) && allRows.length > 0) {
      return allRows as BrandExperienceFeature[];
    }
  }

  const snap = loadLocalStore();
  const features = snap.brand_experience_features || structuredClone(INITIAL_STORE_SNAPSHOT.brand_experience_features);
  const idx = features.findIndex((f) => f.feature_key === input.feature_key);
  if (idx >= 0) {
    features[idx] = {
      ...features[idx],
      status: input.status,
      is_enabled,
      is_coming_soon,
      display_order: input.display_order ?? features[idx].display_order,
      description: input.description ?? features[idx].description,
      updated_at: now,
    };
    recordActivity(
      snap,
      `Set ${features[idx].feature_name} to ${input.status}`,
      'brand_experience',
      features[idx].feature_name
    );
  }
  snap.brand_experience_features = [...features].sort((a, b) => a.display_order - b.display_order);
  saveLocalStore(snap);
  return snap.brand_experience_features;
}

export async function upsertStyleGuide(
  input: Omit<StyleGuide, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<StyleGuide> {
  const now = new Date().toISOString();
  const id = input.id || `sg-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('style_guides')
      .upsert({
        ...input,
        id,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as StyleGuide;
  }

  const snap = loadLocalStore();
  const guides = snap.style_guides || [];
  const idx = guides.findIndex((g) => g.id === id);
  const saved: StyleGuide = {
    ...input,
    id,
    created_at: idx >= 0 ? guides[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) {
    guides[idx] = saved;
    recordActivity(snap, 'Updated style guide', 'style_guide', saved.title);
  } else {
    guides.push(saved);
    recordActivity(snap, 'Created style guide', 'style_guide', saved.title);
  }
  snap.style_guides = [...guides].sort((a, b) => a.display_order - b.display_order);
  saveLocalStore(snap);
  return saved;
}

export async function deleteStyleGuide(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('style_guides').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const guides = snap.style_guides || [];
  const target = guides.find((g) => g.id === id);
  snap.style_guides = guides.filter((g) => g.id !== id);
  recordActivity(snap, 'Deleted style guide', 'style_guide', target?.title || id);
  saveLocalStore(snap);
}

export async function upsertSurpriseBox(
  input: Omit<SurpriseBox, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<SurpriseBox> {
  const now = new Date().toISOString();
  const id = input.id || `box-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('surprise_boxes')
      .upsert({
        ...input,
        id,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SurpriseBox;
  }

  const snap = loadLocalStore();
  const boxes = snap.surprise_boxes || [];
  const idx = boxes.findIndex((b) => b.id === id);
  const saved: SurpriseBox = {
    ...input,
    id,
    created_at: idx >= 0 ? boxes[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) {
    boxes[idx] = saved;
    recordActivity(snap, 'Updated surprise box', 'surprise_box', saved.name);
  } else {
    boxes.push(saved);
    recordActivity(snap, 'Created surprise box', 'surprise_box', saved.name);
  }
  snap.surprise_boxes = [...boxes].sort((a, b) => a.display_order - b.display_order);
  saveLocalStore(snap);
  return saved;
}

export async function deleteSurpriseBox(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('surprise_boxes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const boxes = snap.surprise_boxes || [];
  const target = boxes.find((b) => b.id === id);
  snap.surprise_boxes = boxes.filter((b) => b.id !== id);
  recordActivity(snap, 'Deleted surprise box', 'surprise_box', target?.name || id);
  saveLocalStore(snap);
}

// ============================================================================
// STORE SETTINGS, ORDERS & NEWSLETTER
// ============================================================================

export async function updateStoreSettings(input: Partial<StoreSettings>): Promise<StoreSettings> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data: existing } = await admin.from('store_settings').select('*').limit(1).single();
    const merged = { ...(existing || INITIAL_STORE_SNAPSHOT.settings), ...input, updated_at: now };
    const { data, error } = await admin.from('store_settings').upsert(merged).select().single();
    if (error) throw new Error(error.message);
    return data as StoreSettings;
  }

  const snap = loadLocalStore();
  snap.settings = { ...snap.settings, ...input, updated_at: now };
  recordActivity(snap, 'Updated store settings', 'settings', snap.settings.brand_name);
  saveLocalStore(snap);
  return snap.settings;
}

export async function createOrderRecord(order: Omit<OrderRecord, 'id' | 'created_at'>): Promise<OrderRecord> {
  const now = new Date().toISOString();
  const id = `ord-${crypto.randomUUID().slice(0, 8)}`;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    if (admin) {
      const { data, error } = await admin
        .from('order_records')
        .insert({ ...order, id, created_at: now })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message || 'Order request could not be saved.');
      return data as OrderRecord;
    }
    throw new Error('Order database is unavailable. Please try again.');
  }

  const snap = loadLocalStore();
  const saved: OrderRecord = { ...order, id, created_at: now };
  snap.orders.unshift(saved);
  recordActivity(snap, 'WhatsApp order initiated', 'order', `${saved.reference_code} · ${saved.customer_name}`);
  saveLocalStore(snap);
  return saved;
}

export async function listAdminOrders(
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<OrderRecord[]> {
  if (isSupabaseConfigured()) {
    const client = clientOverride ?? createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    if (!client) throw new Error('Admin database client unavailable.');
    const { data, error } = await client
      .from('order_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data || []) as OrderRecord[];
  }
  return loadLocalStore().orders || [];
}

export async function adminReviewOrder(input: {
  orderId: string;
  action: 'accept' | 'reject';
  adminEmail: string;
  clientOverride?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
}): Promise<OrderRecord> {
  const now = new Date().toISOString();
  const nextStatus = input.action === 'accept' ? 'confirmed' : 'rejected';
  if (isSupabaseConfigured()) {
    const client = input.clientOverride ?? createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    if (!client) throw new Error('Admin database client unavailable.');
    const { data, error } = await client
      .from('order_records')
      .update({
        status: nextStatus,
        payment_status: input.action === 'accept' ? 'paid' : 'unpaid',
        reviewed_by: input.adminEmail,
        reviewed_at: now,
      })
      .eq('id', input.orderId)
      .eq('status', 'pending_whatsapp')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('This order has already been reviewed or no longer exists.');
    return data as OrderRecord;
  }

  const snap = loadLocalStore();
  const index = snap.orders.findIndex((order) => order.id === input.orderId);
  if (index < 0) throw new Error('Order not found.');
  const current = snap.orders[index];
  if (current.status !== 'pending_whatsapp') throw new Error('This order has already been reviewed.');
  const updated: OrderRecord = {
    ...current,
    status: nextStatus,
    payment_status: input.action === 'accept' ? 'paid' : 'unpaid',
    reviewed_by: input.adminEmail,
    reviewed_at: now,
  };
  snap.orders[index] = updated;
  recordActivity(snap, input.action === 'accept' ? 'Accepted WhatsApp order' : 'Rejected WhatsApp order', 'order', updated.reference_code);
  saveLocalStore(snap);
  return updated;
}

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const client = await createSupabaseServerClient();
    if (client) {
      const { error } = await client
        .from('newsletter_subscribers')
        .upsert({ email: normalized, created_at: now }, { onConflict: 'email' });
      if (error) throw new Error(error.message);
      return { ok: true, message: 'Thank you for joining the GIRIDHAR FASHION private dispatch.' };
    }
  }

  const snap = loadLocalStore();
  if (!snap.subscribers.some((s) => s.email === normalized)) {
    snap.subscribers.push({ id: `sub-${crypto.randomUUID().slice(0, 8)}`, email: normalized, created_at: now });
    recordActivity(snap, 'Newsletter subscription', 'newsletter', normalized);
    saveLocalStore(snap);
  }
  return { ok: true, message: 'Thank you for joining the GIRIDHAR FASHION private dispatch.' };
}

// ============================================================================
// AI ASSISTANT SETTINGS & USAGE TRACKING
// ============================================================================

const DEFAULT_AI_SETTINGS: AIAssistantSettings = INITIAL_STORE_SNAPSHOT.ai_settings!;

export async function getAIAssistantSettings(): Promise<AIAssistantSettings> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    if (client) {
      try {
        const { data } = await client.from('ai_assistant_settings').select('*').limit(1).single();
        if (data) {
          return {
            ...DEFAULT_AI_SETTINGS,
            ...(data as Partial<AIAssistantSettings>),
            faqs: Array.isArray((data as AIAssistantSettings).faqs)
              ? (data as AIAssistantSettings).faqs
              : DEFAULT_AI_SETTINGS.faqs,
          };
        }
      } catch {
        // Fallback to local if table not migrated yet
      }
    }
  }

  const snap = loadLocalStore();
  if (!snap.ai_settings) {
    snap.ai_settings = structuredClone(DEFAULT_AI_SETTINGS);
    snap.ai_settings.whatsapp_support_number = snap.settings.whatsapp_number;
  }
  return snap.ai_settings;
}

export async function updateAIAssistantSettings(
  input: AIAssistantSettings
): Promise<AIAssistantSettings> {
  const now = new Date().toISOString();
  const next: AIAssistantSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...input,
    id: input.id || 'default-ai-settings',
    faqs: Array.isArray(input.faqs) ? input.faqs : [],
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        await admin.from('ai_assistant_settings').upsert({
          id: 'default-ai-settings',
          is_enabled: next.is_enabled,
          availability_status: next.availability_status,
          assistant_name: next.assistant_name,
          welcome_message: next.welcome_message,
          whatsapp_support_number: next.whatsapp_support_number,
          active_provider: next.active_provider,
          fallback_provider: next.fallback_provider,
          system_instructions: next.system_instructions,
          rag_enabled: next.rag_enabled,
          faqs: next.faqs,
          updated_at: now,
        });
      } catch {
        // Fallback smoothly if schema wasn't migrated yet
      }
    }
  }

  const snap = loadLocalStore();
  snap.ai_settings = next;
  recordActivity(snap, 'Updated AI Assistant settings', 'ai_settings', next.assistant_name);
  saveLocalStore(snap);
  return next;
}

export async function recordAIUsage(
  query: string,
  language: 'bn' | 'en',
  isNewConversation: boolean
): Promise<void> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin.from('ai_usage_logs').insert({
        topic: query.slice(0, 160),
        language,
        is_new_conversation: isNewConversation,
        created_at: now,
      });
    }
  }

  const snap = loadLocalStore();
  const usage: AIUsageStats = snap.ai_usage ?? {
    total_messages: 0,
    total_conversations: 0,
    bangla_messages: 0,
    english_messages: 0,
    last_used_at: null,
    recent_queries: [],
  };

  usage.total_messages += 1;
  if (isNewConversation) usage.total_conversations += 1;
  if (language === 'bn') usage.bangla_messages += 1;
  else usage.english_messages += 1;
  usage.last_used_at = now;

  usage.recent_queries = [
    { query: query.slice(0, 160), language, created_at: now },
    ...usage.recent_queries,
  ].slice(0, 20);

  snap.ai_usage = usage;
  saveLocalStore(snap);
}

// ============================================================================
// KNOWLEDGE BASE & RAG INDEXING
// ============================================================================

export async function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const { data, error } = await admin
          .from('knowledge_documents')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data as KnowledgeDocument[];
        }
      } catch {
        // Fallback to local
      }
    }
  }
  const snap = loadLocalStore();
  return snap.knowledge_documents || [];
}

export async function upsertKnowledgeDocument(input: {
  id?: string;
  title: string;
  category: string;
  source_type: 'manual_text' | 'pdf' | 'docx' | 'txt';
  file_name: string | null;
  content: string;
  is_enabled: boolean;
}): Promise<KnowledgeDocument> {
  const now = new Date().toISOString();
  const id = input.id || `kdoc-${crypto.randomUUID().slice(0, 8)}`;

  const { chunks, embeddingProvider } = await buildChunksForDocument({
    id,
    title: input.title,
    category: input.category,
    content: input.content,
  });

  const saved: KnowledgeDocument = {
    id,
    title: input.title.trim(),
    category: input.category.trim() || 'General Brand Information',
    source_type: input.source_type,
    file_name: input.file_name,
    content: input.content.trim(),
    chunk_count: chunks.length,
    embedding_provider: embeddingProvider,
    is_enabled: input.is_enabled,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');

    const { data: existingDoc } = await admin
      .from('knowledge_documents')
      .select('created_at')
      .eq('id', id)
      .maybeSingle();

    saved.created_at = (existingDoc as { created_at?: string } | null)?.created_at || now;

    const { error: docErr } = await admin.from('knowledge_documents').upsert(saved);
    if (docErr) throw new Error(docErr.message);

    await admin.from('knowledge_chunks').delete().eq('document_id', id);
    if (chunks.length > 0) {
      const { error: chunkErr } = await admin.from('knowledge_chunks').insert(
        chunks.map((c) => ({
          id: c.id,
          document_id: c.document_id,
          document_title: c.document_title,
          category: c.category,
          chunk_index: c.chunk_index,
          content: c.content,
          embedding: c.embedding,
          keywords: c.keywords,
        }))
      );
      if (chunkErr) throw new Error(chunkErr.message);
    }
    return saved;
  }

  const snap = loadLocalStore();
  const docs = snap.knowledge_documents || [];
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    saved.created_at = docs[idx].created_at;
    docs[idx] = saved;
    recordActivity(snap, 'Updated AI knowledge document', 'knowledge', saved.title);
  } else {
    docs.unshift(saved);
    recordActivity(snap, 'Added AI knowledge document', 'knowledge', saved.title);
  }
  snap.knowledge_documents = docs;
  saveLocalStore(snap);

  const existingChunks = await loadLocalChunks(docs);
  const filteredChunks = existingChunks.filter((c) => c.document_id !== id);
  saveLocalChunks([...filteredChunks, ...chunks]);

  return saved;
}

export async function toggleKnowledgeDocumentStatus(
  id: string,
  is_enabled: boolean
): Promise<KnowledgeDocument | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { data, error } = await admin
      .from('knowledge_documents')
      .update({ is_enabled, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as KnowledgeDocument;
  }

  const snap = loadLocalStore();
  const docs = snap.knowledge_documents || [];
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  docs[idx] = { ...docs[idx], is_enabled, updated_at: now };
  snap.knowledge_documents = docs;
  recordActivity(
    snap,
    is_enabled ? 'Enabled AI knowledge document' : 'Disabled AI knowledge document',
    'knowledge',
    docs[idx].title
  );
  saveLocalStore(snap);
  return docs[idx];
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
    const { error } = await admin.from('knowledge_documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const snap = loadLocalStore();
  const docs = snap.knowledge_documents || [];
  const target = docs.find((d) => d.id === id);
  snap.knowledge_documents = docs.filter((d) => d.id !== id);
  if (target) recordActivity(snap, 'Deleted AI knowledge document', 'knowledge', target.title);
  saveLocalStore(snap);

  const existingChunks = await loadLocalChunks(snap.knowledge_documents);
  saveLocalChunks(existingChunks.filter((c) => c.document_id !== id));
}

export async function searchKnowledgeForQuery(
  query: string,
  topK = 4
): Promise<RetrievedKnowledgeHit[]> {
  const docs = await listKnowledgeDocuments();
  const enabledDocs = docs.filter((d) => d.is_enabled);
  if (enabledDocs.length === 0) return [];

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const { data: chunkRows } = await admin
          .from('knowledge_chunks')
          .select('id, document_id, document_title, category, chunk_index, content, embedding, keywords')
          .in(
            'document_id',
            enabledDocs.map((d) => d.id)
          );
        if (Array.isArray(chunkRows) && chunkRows.length > 0) {
          const normalizedChunks: KnowledgeChunk[] = chunkRows.map((row) => ({
            id: row.id,
            document_id: row.document_id,
            document_title: row.document_title,
            category: row.category,
            chunk_index: row.chunk_index,
            content: row.content,
            embedding: Array.isArray(row.embedding)
              ? row.embedding
              : typeof row.embedding === 'string'
              ? JSON.parse(row.embedding)
              : [],
            keywords: Array.isArray(row.keywords) ? row.keywords : [],
          }));
          return retrieveRelevantKnowledgeChunks({
            query,
            documents: enabledDocs,
            chunks: normalizedChunks,
            topK,
          });
        }
      } catch {
        // Fallback to local
      }
    }
  }

  const chunks = await loadLocalChunks(docs);
  return retrieveRelevantKnowledgeChunks({
    query,
    documents: docs,
    chunks,
    topK,
  });
}
