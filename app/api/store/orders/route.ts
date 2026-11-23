import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateCartOffers } from '@/lib/offers/engine';
import {
  createOrderRecord,
  getPublicStoreData,
  validateMembershipCode,
} from '@/lib/services/store-repository';
import { generateWhatsAppCheckoutUrl, validateCustomerPhone } from '@/lib/whatsapp/checkout';

const orderItemSchema = z.object({
  item_type: z.enum(['product', 'surprise_box']).optional().default('product'),
  product_id: z.string().min(1),
  variant_id: z.string().min(1),
  size: z.string().max(40).optional(),
  style_preference: z.string().max(120).optional(),
  quantity: z.number().int().min(1).max(50),
});

const orderSchema = z.object({
  customer_name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  customer_phone: z
    .string()
    .trim()
    .refine(validateCustomerPhone, 'Please enter a valid Bangladesh or international phone number.'),
  delivery_address: z.string().trim().min(8, 'Please enter a complete delivery address.').max(500),
  notes: z.string().trim().max(400).optional(),
  membership_code: z.string().trim().max(40).optional(),
  channel: z.enum(['whatsapp_cart', 'whatsapp_buy_now']).default('whatsapp_cart'),
  items: z.array(orderItemSchema).min(1, 'Your order must include at least one item.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid checkout information.';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const {
      customer_name,
      customer_phone,
      delivery_address,
      notes,
      membership_code,
      channel,
      items,
    } = parsed.data;
    const store = await getPublicStoreData();

    const resolvedItems = [];
    const garmentOfferItems: { product_id: string; quantity: number }[] = [];
    let regularSubtotal = 0;
    let boxSubtotal = 0;

    for (const reqItem of items) {
      if (reqItem.item_type === 'surprise_box') {
        const boxFeature = store.brand_experience_features.find(
          (f) => f.feature_key === 'surprise_box'
        );
        if (!boxFeature || boxFeature.status !== 'enabled') {
          return NextResponse.json(
            { error: 'Surprise Box orders are currently unavailable.' },
            { status: 400 }
          );
        }

        const box = store.surprise_boxes.find((b) => b.id === reqItem.product_id && b.is_active);
        if (!box) {
          return NextResponse.json(
            { error: 'Selected Surprise Box is no longer available.' },
            { status: 400 }
          );
        }
        if (box.available_quantity < reqItem.quantity) {
          return NextResponse.json(
            { error: `${box.name} only has ${box.available_quantity} box(es) remaining.` },
            { status: 400 }
          );
        }

        const chosenSize =
          reqItem.size && box.available_sizes.includes(reqItem.size)
            ? reqItem.size
            : box.available_sizes[0] || 'M';
        const chosenStyle = reqItem.style_preference?.trim() || box.preference_options[0] || 'Minimal Tailored';
        const subtotal = box.price * reqItem.quantity;
        regularSubtotal += subtotal;
        boxSubtotal += subtotal;

        resolvedItems.push({
          product_id: box.id,
          product_name: `${box.name} (${box.item_count} Pieces)`,
          colour: `Style: ${chosenStyle}`,
          size: chosenSize,
          sku: `SBOX-${box.tier_label.replace(/\s+/g, '').toUpperCase().slice(0, 6)}`,
          quantity: reqItem.quantity,
          unit_price: box.price,
          subtotal,
        });
        continue;
      }

      const product = store.products.find((p) => p.id === reqItem.product_id && p.is_published);
      if (!product) {
        return NextResponse.json({ error: 'One or more selected products are no longer available.' }, { status: 400 });
      }
      const variant = product.variants.find((v) => v.id === reqItem.variant_id);
      if (!variant) {
        return NextResponse.json({ error: `Selected variant for ${product.name} is unavailable.` }, { status: 400 });
      }
      if (variant.stock_status === 'out_of_stock' || variant.stock_quantity < reqItem.quantity) {
        return NextResponse.json(
          { error: `${product.name} (${variant.colour}, ${variant.size}) does not have enough stock.` },
          { status: 400 }
        );
      }

      const subtotal = product.price * reqItem.quantity;
      regularSubtotal += subtotal;
      garmentOfferItems.push({ product_id: product.id, quantity: reqItem.quantity });
      resolvedItems.push({
        product_id: product.id,
        product_name: product.name,
        colour: variant.colour,
        size: variant.size,
        sku: variant.sku,
        quantity: reqItem.quantity,
        unit_price: product.price,
        subtotal,
      });
    }

    // Server-side authoritative offer evaluation on garment items + exact boxSubtotal
    const offerEval = evaluateCartOffers({
      items: garmentOfferItems,
      products: store.products,
      offers: store.offers,
    });

    // Server-side authoritative VIP Membership Code validation (never trust frontend amounts)
    let validatedMembershipCode: string | null = null;
    let membershipDiscount = 0;
    let membershipDiscountPct = 0;

    if (membership_code && membership_code.trim().length > 0) {
      const mVal = await validateMembershipCode(membership_code);
      if (!mVal.valid) {
        return NextResponse.json(
          { error: mVal.error || 'Invalid or inactive VIP Membership Code.' },
          { status: 400 }
        );
      }
      validatedMembershipCode = mVal.code;
      membershipDiscountPct = mVal.discountPercentage;
      membershipDiscount =
        offerEval.final_subtotal > 0
          ? Math.round(offerEval.final_subtotal * (mVal.discountPercentage / 100))
          : 0;
    }

    const finalProductSubtotal = Math.max(0, offerEval.final_subtotal - membershipDiscount);
    const totalAmount = finalProductSubtotal + boxSubtotal;
    const referenceCode = `GF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const wa = generateWhatsAppCheckoutUrl({
      whatsappNumber: store.settings.whatsapp_number,
      brandName: store.settings.brand_name,
      currencySymbol: store.settings.currency_symbol,
      referenceCode,
      items: resolvedItems.map((i) => ({
        productName: i.product_name,
        colour: i.colour,
        size: i.size,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        sku: i.sku,
      })),
      customer: {
        fullName: customer_name,
        phone: customer_phone,
        deliveryAddress: delivery_address,
        notes,
      },
      appliedOffers: offerEval.applied_offers.map((o) => ({
        name: o.offer_name,
        discountAmount: o.discount_amount,
      })),
      freeItems: offerEval.free_items.map((f) => ({
        productName: f.product_name,
        quantity: f.quantity,
        note: f.note,
      })),
      totalDiscount: offerEval.total_discount,
      membershipCode: validatedMembershipCode || undefined,
      membershipDiscount,
      membershipDiscountPct,
      finalTotal: totalAmount,
    });

    if (wa.error || !wa.url) {
      return NextResponse.json({ error: wa.error || 'Unable to generate WhatsApp order link.' }, { status: 400 });
    }

    const rawAffiliateCode = req.cookies.get('gf_affiliate_ref')?.value || null;
    const affiliateCode = rawAffiliateCode && /^[A-Z0-9]{6,16}$/.test(rawAffiliateCode)
      ? rawAffiliateCode
      : null;

    const record = await createOrderRecord({
      reference_code: referenceCode,
      affiliate_code: affiliateCode,
      customer_name,
      customer_phone,
      delivery_address,
      notes: notes || null,
      items: resolvedItems,
      subtotal_before_offers: regularSubtotal,
      offer_discount: offerEval.total_discount,
      applied_offers_summary: offerEval.applied_offers.map((o) => o.summary),
      free_bonus_items: offerEval.free_items.map((f) => `${f.quantity}× ${f.product_name}`),
      membership_code: validatedMembershipCode,
      membership_discount: membershipDiscount,
      total_amount: totalAmount,
      channel,
      status: 'pending_whatsapp',
    });

    return NextResponse.json(
      {
        referenceCode: record.reference_code,
        subtotalBeforeOffers: regularSubtotal,
        offerDiscount: offerEval.total_discount,
        appliedOffers: offerEval.applied_offers,
        freeItems: offerEval.free_items,
        membershipCode: validatedMembershipCode,
        membershipDiscount,
        membershipDiscountPercentage: membershipDiscountPct,
        totalAmount,
        whatsappUrl: wa.url,
        message: wa.message,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to prepare WhatsApp order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
