import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { BrandExperienceFeature, BrandExperienceFeatureKey, StoreSettings } from '@/types/store';
import { SafeImage } from './SafeImage';

const FEATURE_ARTWORK: Record<BrandExperienceFeatureKey, string> = {
  style_guide: '/images/experiences/style-guide.svg',
  vip_membership: '/images/banners/hero-autumn-winter.svg',
  outfit_combo: '/images/banners/promo-tailoring.svg',
  surprise_box: '/images/experiences/surprise-box-standard.svg',
  gift_someone: '/images/experiences/coming-soon-gift.svg',
  mystery_addon: '/images/experiences/coming-soon-addon.svg',
  wardrobe_refresh: '/images/experiences/coming-soon-wardrobe.svg',
  gift_card: '/images/experiences/coming-soon-giftcard.svg',
};

const FEATURE_HIGHLIGHTS: Record<BrandExperienceFeatureKey, string[]> = {
  style_guide: [
    'Occasion-driven outfit combinations and colour harmony notes',
    'Direct piece pairings from our Dhaka tailoring studio',
    'Integrated product-level styling guidance',
  ],
  vip_membership: [
    'Annual concierge membership with verified storefront discount',
    'Direct WhatsApp registration workflow',
    'Priority seasonal collection access',
  ],
  outfit_combo: [
    'Interactive tailored Shirt + Trouser pairing',
    'Automatic bundle valuation inside your shopping bag',
    'Streamlined WhatsApp checkout confirmation',
  ],
  surprise_box: [
    'Budget-tiered mystery wardrobe boxes curated by size and aesthetic',
    'Transparent category scope and stylist curation rules',
    'Seamless bag integration and nationwide COD confirmation',
  ],
  gift_someone: [
    'Bespoke cream-and-forest signature gift presentation box',
    'Handwritten atelier card with custom recipient note',
    'Discreet pricing and direct recipient delivery across Bangladesh',
  ],
  mystery_addon: [
    'Complimentary or preferential surprise piece unlocked at bag checkout',
    'Coordinated accessory or essential matched to your order palette',
    'Optional opt-in during final bag review',
  ],
  wardrobe_refresh: [
    'Guided seasonal capsule planning by budget and personal style',
    'Multi-piece cohesive shirting, knitwear, and trouser rotations',
    'One-click capsule assembly crafted for Dhaka & travel wardrobes',
  ],
  gift_card: [
    'Flexible BDT denominations for birthdays, Eid, and milestones',
    'Personalized digital dispatch for effortless menswear gifting',
    'Concierge assistance to help recipients pick exact fit and size',
  ],
};

export function FeatureComingSoonView({
  feature,
  settings,
}: {
  feature: BrandExperienceFeature;
  settings: StoreSettings;
}) {
  const artwork = FEATURE_ARTWORK[feature.feature_key] || '/images/experiences/coming-soon-gift.svg';
  const highlights = FEATURE_HIGHLIGHTS[feature.feature_key] || [];

  return (
    <div className="bg-[#FAF9F6]">
      <section className="bg-[#173D32] text-[#FAF9F6] border-b border-[#B99A61]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 border border-[#B99A61]/55 bg-[#102B23] text-[#B99A61] text-[11px] font-semibold tracking-[0.2em] uppercase">
                <Clock className="w-3.5 h-3.5" />
                <span>Coming Soon</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#F5F0E7]/75">
                  {settings.brand_name} Signature Experience
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#FAF9F6] leading-[1.08] [text-wrap:balance]">
                  {feature.feature_name}
                </h1>
              </div>

              <p className="text-base text-[#F5F0E7]/85 leading-relaxed max-w-xl">
                {feature.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2.5 bg-[#B99A61] text-[#173D32] px-7 py-3.5 text-xs font-bold tracking-[0.16em] uppercase hover:bg-[#C9AC75] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Shopping</span>
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 border border-[#F5F0E7]/35 text-[#F5F0E7] px-6 py-3.5 text-xs font-semibold tracking-[0.14em] uppercase hover:border-[#F5F0E7] transition-colors"
                >
                  <span>Return Home</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="border border-[#B99A61]/35 bg-[#F5F0E7] overflow-hidden aspect-[4/3]">
                <SafeImage
                  src={artwork}
                  alt={feature.feature_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-[#E4DDD0] p-8 sm:p-10 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#E4DDD0] pb-5">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61] mb-1.5">
                Atelier Preview
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">
                Crafted for Upcoming Release
              </h2>
            </div>
            <Sparkles className="w-5 h-5 text-[#173D32] shrink-0 mt-1" />
          </div>

          <p className="text-sm text-[#5A5853] leading-relaxed">
            Our Dhaka studio is currently preparing the full experience standards, packaging, and
            concierge workflows for <strong className="text-[#242424]">{feature.feature_name}</strong>.
            Until official launch, you can explore our full menswear catalogue, active combo offers,
            Style Guide, and Surprise Boxes.
          </p>

          {highlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {highlights.map((item, idx) => (
                <div key={item} className="bg-[#FAF9F6] border border-[#E4DDD0] p-5 space-y-2">
                  <p className="text-xs font-mono text-[#B99A61] tabular-nums">0{idx + 1}.</p>
                  <p className="text-sm text-[#242424] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-[#E4DDD0] flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#5A5853]">
              Questions for our stylists? Reach us directly via our main collection.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#173D32] hover:text-[#B99A61]"
            >
              <span>Browse Current Menswear</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
