import "server-only";
import { calculateOrderTotalServerSide } from "@/lib/orders/pricing";

export interface CartItem {
  id: string;
  quantity: number;
  customNotes?: string;
}

export interface PriceCalculationResult {
  itemsSubtotal: number;
  packagingTotal: number;
  deliveryFee: number;
  discountTotal: number;
  totalAmount: number;
}

/**
 * Recalculates final order totals server-side using database snapshots.
 */
export async function calculateOrderTotal(
  items: CartItem[],
  orderType: 'delivery' | 'takeaway'
): Promise<PriceCalculationResult> {
  const result = await calculateOrderTotalServerSide(
    items.map(i => ({ menu_item_id: i.id, quantity: i.quantity })),
    orderType
  );
  return {
    itemsSubtotal: result.itemsSubtotal,
    packagingTotal: result.packagingTotal,
    deliveryFee: result.deliveryFee,
    discountTotal: 0,
    totalAmount: result.totalAmount
  };
}
