import { formatPrice } from '@/lib/utils/format';

export interface WhatsAppOrderLineItem {
  productName: string;
  colour: string;
  size: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
}

export interface WhatsAppCustomerInfo {
  fullName: string;
  phone: string;
  deliveryAddress: string;
  notes?: string;
}

export interface WhatsAppAppliedOfferSummary {
  name: string;
  discountAmount: number;
}

export interface WhatsAppFreeBonusItem {
  productName: string;
  quantity: number;
  note?: string;
}

export function sanitizeWhatsAppNumber(rawNumber: string): string {
  const digits = rawNumber.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  return digits;
}

export function validateCustomerPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, '');
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(cleaned) || /^\+?[1-9]\d{7,14}$/.test(cleaned);
}

export function buildWhatsAppOrderMessage(params: {
  brandName: string;
  currencySymbol: string;
  items: WhatsAppOrderLineItem[];
  customer: WhatsAppCustomerInfo;
  referenceCode?: string;
  appliedOffers?: WhatsAppAppliedOfferSummary[];
  freeItems?: WhatsAppFreeBonusItem[];
  totalDiscount?: number;
  membershipCode?: string;
  membershipDiscount?: number;
  membershipDiscountPct?: number;
  finalTotal?: number;
}): string {
  const {
    brandName,
    currencySymbol,
    items,
    customer,
    referenceCode,
    appliedOffers = [],
    freeItems = [],
    totalDiscount = 0,
    membershipCode,
    membershipDiscount = 0,
    membershipDiscountPct = 20,
    finalTotal,
  } = params;

  let regularSubtotal = 0;
  const itemBlocks = items.map((item, idx) => {
    const subtotal = item.unitPrice * item.quantity;
    regularSubtotal += subtotal;
    return [
      `${idx + 1}. ${item.productName}`,
      `Colour: ${item.colour}`,
      `Size: ${item.size}`,
      `Quantity: ${item.quantity}`,
      `Unit Price: ${formatPrice(item.unitPrice, currencySymbol)}`,
      `Subtotal: ${formatPrice(subtotal, currencySymbol)}`,
    ].join('\n');
  });

  const computedTotal =
    typeof finalTotal === 'number'
      ? Math.max(0, finalTotal)
      : Math.max(0, regularSubtotal - totalDiscount - membershipDiscount);

  const lines: string[] = [
    `Hello ${brandName}!`,
    '',
    'I would like to place an order.',
    ...(referenceCode ? [`Reference: ${referenceCode}`] : []),
    '',
    'ORDER DETAILS:',
    '',
    itemBlocks.join('\n\n'),
  ];

  if (freeItems.length > 0) {
    lines.push('', 'COMPLIMENTARY BONUS ITEMS:');
    for (const bonus of freeItems) {
      lines.push(`- ${bonus.quantity}× ${bonus.productName} (FREE${bonus.note ? ` · ${bonus.note}` : ''})`);
    }
  }

  if (totalDiscount > 0 || appliedOffers.length > 0 || (membershipCode && membershipDiscount > 0)) {
    lines.push('', `PRODUCT SUBTOTAL: ${formatPrice(regularSubtotal, currencySymbol)}`);
    for (const offer of appliedOffers) {
      const amountText = offer.discountAmount > 0 ? ` (-${formatPrice(offer.discountAmount, currencySymbol)})` : '';
      lines.push(`OFFER APPLIED: ${offer.name}${amountText}`);
    }
    if (membershipCode && membershipDiscount > 0) {
      lines.push(
        `VIP MEMBERSHIP CODE: ${membershipCode} (-${formatPrice(membershipDiscount, currencySymbol)} · ${membershipDiscountPct}% OFF)`
      );
    }
  }

  lines.push(
    '',
    `FINAL PRODUCT TOTAL: ${formatPrice(computedTotal, currencySymbol)} (Delivery charges calculated separately)`,
    '',
    'CUSTOMER DETAILS:',
    '',
    `Name: ${customer.fullName.trim()}`,
    `Phone: ${customer.phone.trim()}`,
    `Address: ${customer.deliveryAddress.trim()}`
  );

  if (customer.notes?.trim()) {
    lines.push(`Notes: ${customer.notes.trim()}`);
  }

  lines.push('', 'Please confirm my order.');

  return lines.join('\n');
}

export function generateWhatsAppCheckoutUrl(params: {
  whatsappNumber: string;
  brandName: string;
  currencySymbol: string;
  items: WhatsAppOrderLineItem[];
  customer: WhatsAppCustomerInfo;
  referenceCode?: string;
  appliedOffers?: WhatsAppAppliedOfferSummary[];
  freeItems?: WhatsAppFreeBonusItem[];
  totalDiscount?: number;
  membershipCode?: string;
  membershipDiscount?: number;
  membershipDiscountPct?: number;
  finalTotal?: number;
}): { url: string; message: string; error?: string } {
  const sanitizedNumber = sanitizeWhatsAppNumber(params.whatsappNumber);
  if (!sanitizedNumber || sanitizedNumber.length < 8) {
    return {
      url: '',
      message: '',
      error: 'Store WhatsApp business number is not configured properly. Please contact store support.',
    };
  }

  if (params.items.length === 0) {
    return {
      url: '',
      message: '',
      error: 'Cannot generate an order message with an empty item list.',
    };
  }

  const message = buildWhatsAppOrderMessage(params);
  const encoded = encodeURIComponent(message);
  return {
    url: `https://wa.me/${sanitizedNumber}?text=${encoded}`,
    message,
  };
}
