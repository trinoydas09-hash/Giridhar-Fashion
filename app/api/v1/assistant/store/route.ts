import { NextRequest, NextResponse } from 'next/server';
import { OFFER_TYPE_LABELS } from '@/lib/offers/engine';
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
      brand_name: store.settings.brand_name,
      tagline: store.settings.tagline,
      currency_code: store.settings.currency_code,
      currency_symbol: store.settings.currency_symbol,
      whatsapp_ordering: {
        business_number: store.settings.whatsapp_number,
        checkout_url: '/checkout',
        supported_modes: ['whatsapp_cart', 'whatsapp_buy_now'],
      },
      delivery: {
        summary: store.settings.delivery_info,
        dhaka_charge: store.settings.delivery_charge_dhaka,
        outside_dhaka_charge: store.settings.delivery_charge_outside,
        free_delivery_threshold: store.settings.free_delivery_threshold,
      },
      active_offers: store.offers.map((o) => ({
        id: o.id,
        name: o.name,
        type: OFFER_TYPE_LABELS[o.offer_type] || o.offer_type,
        badge: o.badge_text,
        description: o.description,
        min_quantity: o.min_quantity,
        get_free_quantity: o.get_free_quantity,
        discount_percentage: o.discount_percentage,
        discount_amount: o.discount_amount,
        special_bundle_price: o.special_bundle_price,
        start_date: o.start_date,
        end_date: o.end_date,
      })),
      active_promotions: store.promotions.map((p) => ({
        title: p.title,
        description: p.description,
        discount_text: p.discount_text,
        start_date: p.start_date,
        end_date: p.end_date,
      })),
      membership: store.membership.is_active
        ? {
            name: store.membership.name,
            price_bdt: store.membership.price_bdt,
            billing_period: store.membership.billing_period_label,
            discount_percentage: store.membership.discount_percentage,
            validity: store.membership.validity_text,
            page_url: '/membership',
          }
        : null,
      contact: {
        email: store.settings.store_email,
        address: store.settings.address,
        instagram: store.settings.instagram_url,
        facebook: store.settings.facebook_url,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load store configuration.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
