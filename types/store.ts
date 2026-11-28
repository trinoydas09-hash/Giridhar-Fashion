export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'customer';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  colour?: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  colour: string;
  colour_hex: string;
  size: string;
  sku: string;
  stock_status: StockStatus;
  stock_quantity: number;
  created_at: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string;
  category?: Category;
  is_published: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  specifications: ProductSpecification[];
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface HomepageBanner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
  placement: 'hero' | 'promotional';
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export type HomepageSectionKey =
  | 'hero'
  | 'categories'
  | 'new_arrivals'
  | 'best_sellers'
  | 'featured_collections'
  | 'promotional_banner'
  | 'brand_experience'
  | 'brand_story'
  | 'social_gallery'
  | 'newsletter';

export interface HomepageSectionConfig {
  id: string;
  section_key: HomepageSectionKey;
  title: string;
  subtitle: string;
  is_visible: boolean;
  display_order: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_text: string;
  promo_code: string | null;
  banner_image_url: string | null;
  cta_href: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// ADVANCED OFFERS & COMBO BUILDER
// ============================================================================

export type OfferType =
  | 'bogo_free'
  | 'buy_2_get_1'
  | 'buy_x_get_y'
  | 'buy_2_special_price'
  | 'buy_3_special_price'
  | 'percentage_discount'
  | 'fixed_discount'
  | 'bundle_combo'
  | 'custom_promo';

export interface Offer {
  id: string;
  name: string;
  description: string;
  offer_type: OfferType;
  badge_text: string;
  eligible_product_ids: string[];
  eligible_category_ids: string[];
  min_quantity: number;
  get_free_quantity: number;
  free_product_id: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  special_bundle_price: number | null;
  start_date: string;
  end_date: string;
  banner_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppliedOfferDetail {
  offer_id: string;
  offer_name: string;
  offer_type: OfferType;
  discount_amount: number;
  free_items: {
    product_id: string;
    product_name: string;
    quantity: number;
    note: string;
  }[];
  summary: string;
}

export interface OfferEvaluationResult {
  original_subtotal: number;
  total_discount: number;
  final_subtotal: number;
  applied_offers: AppliedOfferDetail[];
  free_items: AppliedOfferDetail['free_items'];
  eligible_hints: string[];
}

// ============================================================================
// PREMIUM MEMBERSHIP SYSTEM
// ============================================================================

export interface MembershipBenefit {
  id: string;
  title: string;
  description: string;
}

export interface MembershipStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
}

export interface MembershipFaq {
  id: string;
  question: string;
  answer: string;
}

export type MembershipRequestStatus = 'pending' | 'approved' | 'rejected';
export type MembershipRecordStatus = 'active' | 'inactive' | 'expired';

export interface MembershipRequest {
  id: string;
  request_code: string;
  customer_name: string | null;
  whatsapp_number: string | null;
  membership_fee: number;
  discount_percentage: number;
  request_status: MembershipRequestStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRecord {
  id: string;
  request_id: string;
  customer_name: string | null;
  whatsapp_number: string | null;
  membership_status: MembershipRecordStatus;
  membership_fee: number;
  discount_percentage: number;
  activated_at: string | null;
  expires_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipCode {
  id: string;
  code: string;
  request_id: string;
  membership_record_id: string | null;
  is_active: boolean;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRequestView {
  id: string;
  request_code: string;
  customer_name: string | null;
  whatsapp_number: string | null;
  membership_fee: number;
  discount_percentage: number;
  request_status: MembershipRequestStatus;
  membership_record_id: string | null;
  membership_code: string | null;
  membership_status: MembershipRecordStatus;
  is_code_active: boolean;
  activated_at: string | null;
  expires_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipConfig {
  id: string;
  is_active: boolean;
  name: string;
  tagline: string;
  hero_description: string;
  price_bdt: number;
  billing_period_label: string;
  validity_text: string;
  discount_percentage: number;
  promo_banner_text: string;
  cta_button_label: string;
  whatsapp_message_template: string;
  benefits: MembershipBenefit[];
  how_it_works: MembershipStep[];
  faqs: MembershipFaq[];
  updated_at: string;
}

// ============================================================================
// STORE SETTINGS, CART & ORDERS
// ============================================================================

export interface StoreSettings {
  id: string;
  brand_name: string;
  tagline: string;
  logo_url: string;
  whatsapp_number: string;
  store_email: string;
  currency_code: string;
  currency_symbol: string;
  announcement_text: string;
  announcement_active: boolean;
  delivery_info: string;
  delivery_charge_dhaka: number;
  delivery_charge_outside: number;
  free_delivery_threshold: number;
  instagram_url: string;
  facebook_url: string;
  story_title: string;
  story_body: string;
  address: string;
  updated_at: string;
}

export interface CartItem {
  id: string; // productId::variantId or box::boxId::size::style
  item_type?: 'product' | 'surprise_box';
  product_id: string;
  product_slug: string;
  product_name: string;
  image_url: string;
  variant_id: string;
  colour: string;
  colour_hex: string;
  size: string;
  sku: string;
  unit_price: number;
  compare_at_price: number | null;
  quantity: number;
  max_stock: number;
  box_id?: string;
  style_preference?: string;
}

export interface OrderRecord {
  id: string;
  reference_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes: string | null;
  items: {
    product_id: string;
    product_name: string;
    colour: string;
    size: string;
    sku: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  subtotal_before_offers?: number;
  offer_discount?: number;
  applied_offers_summary?: string[];
  free_bonus_items?: string[];
  membership_code?: string | null;
  membership_discount?: number;
  affiliate_user_id?: string | null;
  affiliate_code?: string | null;
  affiliate_commission?: number | null;
  total_amount: number;
  channel: 'whatsapp_cart' | 'whatsapp_buy_now';
  status: 'pending_whatsapp' | 'confirmed' | 'rejected' | 'dispatched' | 'completed';
  payment_status?: 'unverified' | 'paid' | 'unpaid';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string;
  created_at: string;
}

// ============================================================================
// MULTI-PROVIDER AI & KNOWLEDGE BASE (RAG)
// ============================================================================

export type AIProviderId = 'gemini' | 'openai' | 'custom';

export interface AIProviderConfigPublic {
  provider: AIProviderId;
  label: string;
  is_enabled: boolean;
  selected_model: string;
  available_models: string[];
  custom_base_url: string | null;
  has_api_key: boolean;
  key_preview: string | null;
  last_tested_at: string | null;
  last_test_status: 'untested' | 'ok' | 'error';
  last_test_message: string | null;
}

export interface AIFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface AIAssistantSettings {
  id?: string;
  is_enabled: boolean;
  availability_status: 'online' | 'away' | 'offline';
  assistant_name: string;
  welcome_message: string;
  whatsapp_support_number: string;
  active_provider: AIProviderId;
  fallback_provider: AIProviderId | null;
  system_instructions: string;
  rag_enabled: boolean;
  faqs: AIFaqItem[];
  updated_at?: string;
}

export interface AIUsageStats {
  total_messages: number;
  total_conversations: number;
  bangla_messages: number;
  english_messages: number;
  last_used_at?: string | null;
  recent_queries: { query: string; language: 'bn' | 'en'; created_at: string }[];
}

export type KnowledgeCategory =
  | 'Delivery Policy'
  | 'Return & Exchange Policy'
  | 'Refund Policy'
  | 'Membership Information'
  | 'Product Information'
  | 'Payment Information'
  | 'Size Guide'
  | 'Offers & Promotions'
  | 'Frequently Asked Questions'
  | 'General Brand Information'
  | string;

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  source_type: 'manual_text' | 'pdf' | 'docx' | 'txt';
  file_name: string | null;
  content: string;
  chunk_count: number;
  embedding_provider: 'gemini' | 'openai' | 'local';
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  document_title: string;
  category: KnowledgeCategory;
  chunk_index: number;
  content: string;
  embedding: number[];
  keywords: string[];
}

export interface RetrievedKnowledgeHit {
  chunk_id: string;
  document_id: string;
  document_title: string;
  category: string;
  content: string;
  score: number;
}

// ============================================================================
// BRAND EXPERIENCE SYSTEM (STYLE GUIDE, SURPRISE BOX & FEATURE FLAGS)
// ============================================================================

export type BrandExperienceFeatureKey =
  | 'style_guide'
  | 'vip_membership'
  | 'outfit_combo'
  | 'surprise_box'
  | 'gift_someone'
  | 'mystery_addon'
  | 'wardrobe_refresh'
  | 'gift_card';

export type BrandExperienceStatus = 'enabled' | 'coming_soon' | 'disabled';

export interface BrandExperienceFeature {
  id: string;
  feature_key: BrandExperienceFeatureKey;
  feature_name: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3';
  status: BrandExperienceStatus;
  is_enabled: boolean;
  is_coming_soon: boolean;
  display_order: number;
  description: string;
  route_path: string;
  updated_at: string;
}

export interface StyleGuide {
  id: string;
  title: string;
  slug: string;
  summary: string;
  styling_recommendations: string;
  outfit_combinations: string;
  colour_coordination_tips: string;
  occasion: string;
  image_url: string;
  connected_product_ids: string[];
  matching_product_ids: string[];
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SurpriseBox {
  id: string;
  name: string;
  slug: string;
  tier_label: string;
  price: number;
  description: string;
  selection_rules_note: string;
  image_url: string;
  included_category_ids: string[];
  item_count: number;
  available_sizes: string[];
  preference_options: string[];
  available_quantity: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreSnapshot {
  categories: Category[];
  products: Product[];
  banners: HomepageBanner[];
  sections: HomepageSectionConfig[];
  promotions: Promotion[];
  offers: Offer[];
  membership: MembershipConfig;
  membership_requests?: MembershipRequest[];
  membership_records?: MembershipRecord[];
  membership_codes?: MembershipCode[];
  brand_experience_features: BrandExperienceFeature[];
  style_guides: StyleGuide[];
  surprise_boxes: SurpriseBox[];
  settings: StoreSettings;
  orders: OrderRecord[];
  subscribers: { id: string; email: string; created_at: string }[];
  activity: ActivityEntry[];
  ai_settings?: AIAssistantSettings;
  ai_usage?: AIUsageStats;
  ai_providers?: AIProviderConfigPublic[];
  knowledge_documents?: KnowledgeDocument[];
}
