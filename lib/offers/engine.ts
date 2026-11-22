import {
  AppliedOfferDetail,
  Offer,
  OfferEvaluationResult,
  OfferType,
  Product,
} from '@/types/store';

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  bogo_free: 'Buy 1 Get 1 Free',
  buy_2_get_1: 'Buy 2 Get 1 Free',
  buy_x_get_y: 'Buy X Get Y Free',
  buy_2_special_price: 'Buy 2 Products at Special Price',
  buy_3_special_price: 'Buy 3 Products at Special Price',
  percentage_discount: 'Percentage Discount',
  fixed_discount: 'Fixed Amount Discount',
  bundle_combo: 'Bundle / Combo Offer',
  custom_promo: 'Custom Promotional Offer',
};

export function isOfferCurrentlyValid(offer: Offer, referenceDate?: string): boolean {
  if (!offer.is_active) return false;
  const today = referenceDate || new Date().toISOString().slice(0, 10);
  if (offer.start_date && offer.start_date > today) return false;
  if (offer.end_date && offer.end_date < today) return false;
  return true;
}

export function isProductEligibleForOffer(product: Product, offer: Offer): boolean {
  const hasProducts = offer.eligible_product_ids.length > 0;
  const hasCategories = offer.eligible_category_ids.length > 0;
  if (!hasProducts && !hasCategories) {
    return true;
  }
  return (
    offer.eligible_product_ids.includes(product.id) ||
    offer.eligible_category_ids.includes(product.category_id)
  );
}

export function getActiveOffersForProduct(product: Product, offers: Offer[]): Offer[] {
  return offers.filter((offer) => isOfferCurrentlyValid(offer) && isProductEligibleForOffer(product, offer));
}

export interface EvaluableLineItem {
  product_id: string;
  quantity: number;
  unit_price?: number;
}

interface ExpandedUnit {
  product_id: string;
  product_name: string;
  unit_price: number;
  unit_index: number;
}

function evaluateSingleOffer(
  offer: Offer,
  eligibleUnits: ExpandedUnit[],
  productById: Map<string, Product>
): {
  discount: number;
  freeItems: AppliedOfferDetail['free_items'];
  consumedUnitIndices: number[];
  summary: string;
  hint: string | null;
} {
  const totalQty = eligibleUnits.length;
  if (totalQty === 0) {
    return { discount: 0, freeItems: [], consumedUnitIndices: [], summary: '', hint: null };
  }

  // Sort units ascending by price when discounting lowest-priced free units, or descending for high-value bundles
  const sortedAsc = [...eligibleUnits].sort((a, b) => a.unit_price - b.unit_price);
  const freeTargetProduct = offer.free_product_id ? productById.get(offer.free_product_id) : undefined;

  switch (offer.offer_type) {
    case 'bogo_free':
    case 'buy_2_get_1':
    case 'buy_x_get_y': {
      const buyX =
        offer.offer_type === 'bogo_free'
          ? 1
          : offer.offer_type === 'buy_2_get_1'
          ? 2
          : Math.max(1, offer.min_quantity || 1);
      const getY =
        offer.offer_type === 'bogo_free'
          ? Math.max(1, offer.get_free_quantity || 1)
          : offer.offer_type === 'buy_2_get_1'
          ? Math.max(1, offer.get_free_quantity || 1)
          : Math.max(1, offer.get_free_quantity || 1);

      // Case A: Distinct free bonus product selected
      if (freeTargetProduct) {
        const sets = Math.floor(totalQty / buyX);
        if (sets <= 0) {
          const needed = buyX - totalQty;
          return {
            discount: 0,
            freeItems: [],
            consumedUnitIndices: [],
            summary: '',
            hint: `Add ${needed} more eligible piece${needed > 1 ? 's' : ''} to unlock "${offer.name}" (Free ${freeTargetProduct.name}).`,
          };
        }
        const freeQty = sets * getY;
        const consumed = sortedAsc.slice(0, sets * buyX).map((u) => u.unit_index);
        return {
          discount: 0,
          freeItems: [
            {
              product_id: freeTargetProduct.id,
              product_name: freeTargetProduct.name,
              quantity: freeQty,
              note: `Complimentary via ${offer.name}`,
            },
          ],
          consumedUnitIndices: consumed,
          summary: `${offer.name}: ${freeQty}× complimentary ${freeTargetProduct.name}`,
          hint: null,
        };
      }

      // Case B: Buy X Get Y within eligible items themselves -> groups of (X + Y)
      const groupSize = buyX + getY;
      const groups = Math.floor(totalQty / groupSize);
      if (groups <= 0) {
        if (totalQty >= buyX) {
          const needed = groupSize - totalQty;
          return {
            discount: 0,
            freeItems: [],
            consumedUnitIndices: [],
            summary: '',
            hint: `Add ${needed} more eligible piece${needed > 1 ? 's' : ''} to receive ${getY} complimentary item${getY > 1 ? 's' : ''} (${offer.name}).`,
          };
        }
        return { discount: 0, freeItems: [], consumedUnitIndices: [], summary: '', hint: null };
      }

      const freeCount = groups * getY;
      const freeUnits = sortedAsc.slice(0, freeCount);
      const discount = freeUnits.reduce((sum, u) => sum + u.unit_price, 0);
      const consumed = sortedAsc.slice(0, groups * groupSize).map((u) => u.unit_index);
      return {
        discount,
        freeItems: [],
        consumedUnitIndices: consumed,
        summary: `${offer.name}: ${freeCount} complimentary item${freeCount > 1 ? 's' : ''} deducted`,
        hint: null,
      };
    }

    case 'buy_2_special_price':
    case 'buy_3_special_price': {
      const bundleCount = offer.offer_type === 'buy_2_special_price' ? 2 : 3;
      const specialPrice = offer.special_bundle_price ?? 0;
      if (specialPrice <= 0) {
        return { discount: 0, freeItems: [], consumedUnitIndices: [], summary: '', hint: null };
      }

      const groups = Math.floor(totalQty / bundleCount);
      if (groups <= 0) {
        const needed = bundleCount - totalQty;
        return {
          discount: 0,
          freeItems: [],
          consumedUnitIndices: [],
          summary: '',
          hint: `Add ${needed} more eligible piece${needed > 1 ? 's' : ''} to unlock "${offer.name}".`,
        };
      }

      const usedUnits = sortedAsc.slice(0, groups * bundleCount);
      const regularGroupTotal = usedUnits.reduce((sum, u) => sum + u.unit_price, 0);
      const targetGroupTotal = groups * specialPrice;
      const discount = Math.max(0, regularGroupTotal - targetGroupTotal);
      return {
        discount,
        freeItems: [],
        consumedUnitIndices: usedUnits.map((u) => u.unit_index),
        summary: `${offer.name}: ${groups} bundle${groups > 1 ? 's' : ''} at special price`,
        hint: null,
      };
    }

    case 'bundle_combo': {
      const minQty = Math.max(2, offer.min_quantity || offer.eligible_product_ids.length || 2);
      // If multiple specific products are selected as a curated combo, encourage completing the set
      const distinctRequired = offer.eligible_product_ids;
      if (distinctRequired.length >= 2) {
        const presentProductIds = new Set(eligibleUnits.map((u) => u.product_id));
        const missing = distinctRequired.filter((pid) => !presentProductIds.has(pid));
        if (missing.length > 0) {
          const missingNames = missing
            .map((pid) => productById.get(pid)?.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ');
          return {
            discount: 0,
            freeItems: [],
            consumedUnitIndices: [],
            summary: '',
            hint: missingNames
              ? `Pair with ${missingNames} to unlock combo "${offer.name}".`
              : null,
          };
        }
      }

      if (totalQty < minQty) {
        const needed = minQty - totalQty;
        return {
          discount: 0,
          freeItems: [],
          consumedUnitIndices: [],
          summary: '',
          hint: `Add ${needed} more piece${needed > 1 ? 's' : ''} to unlock combo "${offer.name}".`,
        };
      }

      const regularSum = eligibleUnits.reduce((sum, u) => sum + u.unit_price, 0);
      let discount = 0;
      if (offer.special_bundle_price && offer.special_bundle_price > 0) {
        const sets = Math.floor(totalQty / minQty);
        const setUnits = sortedAsc.slice(0, sets * minQty);
        const setRegular = setUnits.reduce((s, u) => s + u.unit_price, 0);
        discount = Math.max(0, setRegular - sets * offer.special_bundle_price);
      } else if (offer.discount_percentage && offer.discount_percentage > 0) {
        discount = Math.round(regularSum * (offer.discount_percentage / 100));
      } else if (offer.discount_amount && offer.discount_amount > 0) {
        discount = Math.min(regularSum, offer.discount_amount);
      }

      const freeItems: AppliedOfferDetail['free_items'] = freeTargetProduct
        ? [
            {
              product_id: freeTargetProduct.id,
              product_name: freeTargetProduct.name,
              quantity: Math.max(1, offer.get_free_quantity || 1),
              note: `Included in ${offer.name}`,
            },
          ]
        : [];

      return {
        discount,
        freeItems,
        consumedUnitIndices: eligibleUnits.map((u) => u.unit_index),
        summary: offer.name,
        hint: null,
      };
    }

    case 'percentage_discount': {
      const minQty = Math.max(1, offer.min_quantity || 1);
      if (totalQty < minQty) {
        return {
          discount: 0,
          freeItems: [],
          consumedUnitIndices: [],
          summary: '',
          hint: `Add ${minQty - totalQty} more eligible piece(s) to unlock ${offer.discount_percentage ?? 0}% off (${offer.name}).`,
        };
      }
      const pct = Math.min(95, Math.max(0, offer.discount_percentage || 0));
      const subtotal = eligibleUnits.reduce((sum, u) => sum + u.unit_price, 0);
      const discount = Math.round(subtotal * (pct / 100));
      return {
        discount,
        freeItems: [],
        consumedUnitIndices: eligibleUnits.map((u) => u.unit_index),
        summary: `${offer.name} (${pct}% off)`,
        hint: null,
      };
    }

    case 'fixed_discount': {
      const minQty = Math.max(1, offer.min_quantity || 1);
      if (totalQty < minQty) {
        return {
          discount: 0,
          freeItems: [],
          consumedUnitIndices: [],
          summary: '',
          hint: `Add ${minQty - totalQty} more eligible piece(s) to unlock "${offer.name}".`,
        };
      }
      const subtotal = eligibleUnits.reduce((sum, u) => sum + u.unit_price, 0);
      const discount = Math.min(subtotal, Math.max(0, offer.discount_amount || 0));
      return {
        discount,
        freeItems: [],
        consumedUnitIndices: eligibleUnits.map((u) => u.unit_index),
        summary: offer.name,
        hint: null,
      };
    }

    case 'custom_promo': {
      const minQty = Math.max(1, offer.min_quantity || 1);
      if (totalQty < minQty) {
        return {
          discount: 0,
          freeItems: [],
          consumedUnitIndices: [],
          summary: '',
          hint: `Add ${minQty - totalQty} more piece(s) to qualify for "${offer.name}".`,
        };
      }
      const subtotal = eligibleUnits.reduce((sum, u) => sum + u.unit_price, 0);
      let discount = 0;
      if (offer.special_bundle_price && offer.special_bundle_price > 0) {
        discount = Math.max(0, subtotal - offer.special_bundle_price);
      } else if (offer.discount_percentage && offer.discount_percentage > 0) {
        discount = Math.round(subtotal * (offer.discount_percentage / 100));
      } else if (offer.discount_amount && offer.discount_amount > 0) {
        discount = Math.min(subtotal, offer.discount_amount);
      }
      const freeItems: AppliedOfferDetail['free_items'] =
        freeTargetProduct && (offer.get_free_quantity || 0) > 0
          ? [
              {
                product_id: freeTargetProduct.id,
                product_name: freeTargetProduct.name,
                quantity: offer.get_free_quantity,
                note: `Bonus via ${offer.name}`,
              },
            ]
          : [];

      return {
        discount,
        freeItems,
        consumedUnitIndices: eligibleUnits.map((u) => u.unit_index),
        summary: offer.name,
        hint: null,
      };
    }

    default:
      return { discount: 0, freeItems: [], consumedUnitIndices: [], summary: '', hint: null };
  }
}

export function evaluateCartOffers(params: {
  items: EvaluableLineItem[];
  products: Product[];
  offers: Offer[];
  referenceDate?: string;
}): OfferEvaluationResult {
  const { items, products, offers, referenceDate } = params;
  const productById = new Map(products.map((p) => [p.id, p]));

  // Expand line items into discrete priced units so multi-offer non-overlapping calculation is exact
  const expandedUnits: ExpandedUnit[] = [];
  let unitCounter = 0;
  for (const item of items) {
    const product = productById.get(item.product_id);
    if (!product) continue;
    const price = product.price;
    for (let i = 0; i < Math.max(0, item.quantity); i++) {
      expandedUnits.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: price,
        unit_index: unitCounter++,
      });
    }
  }

  const originalSubtotal = expandedUnits.reduce((sum, u) => sum + u.unit_price, 0);
  const activeOffers = offers.filter((o) => isOfferCurrentlyValid(o, referenceDate));

  if (expandedUnits.length === 0 || activeOffers.length === 0) {
    return {
      original_subtotal: originalSubtotal,
      total_discount: 0,
      final_subtotal: originalSubtotal,
      applied_offers: [],
      free_items: [],
      eligible_hints: [],
    };
  }

  // Greedy selection by highest savings / bonus value without overlapping the same unit twice
  const remainingOffers = [...activeOffers];
  const consumedUnits = new Set<number>();
  const appliedOffers: AppliedOfferDetail[] = [];
  const allFreeItems: AppliedOfferDetail['free_items'] = [];
  const hints: string[] = [];

  for (let pass = 0; pass < activeOffers.length; pass++) {
    let bestCandidate: {
      offer: Offer;
      discount: number;
      freeItems: AppliedOfferDetail['free_items'];
      consumedUnitIndices: number[];
      summary: string;
      score: number;
    } | null = null;

    for (const offer of remainingOffers) {
      if (appliedOffers.some((a) => a.offer_id === offer.id)) continue;

      const eligibleUnits = expandedUnits.filter((u) => {
        if (consumedUnits.has(u.unit_index)) return false;
        const product = productById.get(u.product_id);
        return product ? isProductEligibleForOffer(product, offer) : false;
      });

      if (eligibleUnits.length === 0) continue;

      const outcome = evaluateSingleOffer(offer, eligibleUnits, productById);
      if (outcome.hint && !hints.includes(outcome.hint)) {
        hints.push(outcome.hint);
      }

      const bonusValue = outcome.freeItems.reduce((sum, f) => {
        const fp = productById.get(f.product_id);
        return sum + (fp ? fp.price * f.quantity : 500);
      }, 0);

      const score = outcome.discount + bonusValue;
      if (score > 0 || outcome.freeItems.length > 0) {
        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            offer,
            discount: outcome.discount,
            freeItems: outcome.freeItems,
            consumedUnitIndices: outcome.consumedUnitIndices,
            summary: outcome.summary,
            score,
          };
        }
      }
    }

    if (!bestCandidate) break;

    bestCandidate.consumedUnitIndices.forEach((idx) => consumedUnits.add(idx));
    appliedOffers.push({
      offer_id: bestCandidate.offer.id,
      offer_name: bestCandidate.offer.name,
      offer_type: bestCandidate.offer.offer_type,
      discount_amount: bestCandidate.discount,
      free_items: bestCandidate.freeItems,
      summary: bestCandidate.summary,
    });
    allFreeItems.push(...bestCandidate.freeItems);
  }

  const totalDiscount = Math.min(
    originalSubtotal,
    appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0)
  );

  return {
    original_subtotal: originalSubtotal,
    total_discount: totalDiscount,
    final_subtotal: Math.max(0, originalSubtotal - totalDiscount),
    applied_offers: appliedOffers,
    free_items: allFreeItems,
    eligible_hints: hints.slice(0, 3),
  };
}
