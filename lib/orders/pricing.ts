import "server-only";
import { createAdminClient } from '@/lib/supabase/admin';

export interface PriceCalculationItem {
  menu_item_id: string;
  quantity: number;
}

export interface PriceCalculationResult {
  itemsSubtotal: number; // decimal (PLN)
  packagingTotal: number; // decimal (PLN)
  deliveryFee: number; // decimal (PLN), defaults to 0.00 if TBD
  isDeliveryFeeCalculated: boolean;
  totalAmount: number; // decimal (PLN)
  dbItemsSnapshots: Record<string, {
    priceGrosz: number;
    name_pl: string;
    name_en: string;
    allergens: string[];
    spiciness: number;
  }>;
  packagingGrosz: number;
}

/**
 * Server-side trusted pricing calculator.
 * Prevents client-side price manipulation by fetching raw database values.
 * Performs all arithmetic using grosz integers (cents) to avoid rounding issues.
 */
export async function calculateOrderTotalServerSide(
  items: PriceCalculationItem[],
  orderType: 'delivery' | 'takeaway'
): Promise<PriceCalculationResult> {
  const adminClient = createAdminClient();

  const itemIds = items.map(item => item.menu_item_id);

  // 1. Fetch menu items from DB (only active, non-deleted, available items)
  const { data: dbItems, error: itemsError } = await adminClient
    .from('menu_items')
    .select('id, name_pl, name_en, price, is_available, is_active, is_deleted, allergens, spiciness')
    .in('id', itemIds);

  if (itemsError || !dbItems || dbItems.length !== itemIds.length) {
    throw new Error('Some selected items are not available or do not exist');
  }

  // Double check item states
  for (const dbItem of dbItems) {
    if (!dbItem.is_active || dbItem.is_deleted || !dbItem.is_available) {
      throw new Error(`Item ${dbItem.name_en || dbItem.id} is currently unavailable`);
    }
  }

  // Map database items for quick retrieval
  const dbItemsSnapshots: Record<string, {
    priceGrosz: number;
    name_pl: string;
    name_en: string;
    allergens: string[];
    spiciness: number;
  }> = {};

  dbItems.forEach(item => {
    dbItemsSnapshots[item.id] = {
      priceGrosz: Math.round(Number(item.price) * 100),
      name_pl: item.name_pl,
      name_en: item.name_en,
      allergens: item.allergens || [],
      spiciness: item.spiciness || 0,
    };
  });

  // 2. Fetch active packaging fee rules
  const { data: packagingRules } = await adminClient
    .from('packaging_fee_rules')
    .select('*')
    .eq('is_active', true);

  // Fetch packaging mappings for these menu items
  const { data: itemPackagingMaps } = await adminClient
    .from('menu_item_packaging_rules')
    .select('*')
    .in('menu_item_id', itemIds)
    .eq('is_required', true);

  // 3. Compute items subtotal in grosz (cents)
  let subtotalGrosz = 0;
  for (const item of items) {
    const dbItem = dbItemsSnapshots[item.menu_item_id];
    subtotalGrosz += dbItem.priceGrosz * item.quantity;
  }

  // 4. Compute packaging total in grosz
  let packagingGrosz = 0;
  if (packagingRules && itemPackagingMaps && itemPackagingMaps.length > 0) {
    for (const item of items) {
      const maps = itemPackagingMaps.filter(m => m.menu_item_id === item.menu_item_id);
      for (const map of maps) {
        const rule = packagingRules.find(r => r.id === map.packaging_fee_rule_id);
        if (rule) {
          // Check if rule applies to the selected order type
          const applies = orderType === 'delivery' ? rule.applies_to_delivery : rule.applies_to_takeaway;
          if (applies) {
            const ruleAmountGrosz = Math.round(Number(rule.amount) * 100);
            packagingGrosz += ruleAmountGrosz * (map.default_quantity || 1) * item.quantity;
          }
        }
      }
    }
  }

  // 5. Delivery fee calculation
  // Since automatic calculation is not ready/unsupported, delivery_fee defaults to 0.00 and isDeliveryFeeCalculated is false (TBD)
  const deliveryFeeGrosz = 0;
  const isDeliveryFeeCalculated = false;

  // 6. Compute final total
  const totalGrosz = subtotalGrosz + packagingGrosz + deliveryFeeGrosz;

  return {
    itemsSubtotal: subtotalGrosz / 100,
    packagingTotal: packagingGrosz / 100,
    deliveryFee: deliveryFeeGrosz / 100,
    isDeliveryFeeCalculated,
    totalAmount: totalGrosz / 100,
    dbItemsSnapshots,
    packagingGrosz
  };
}
